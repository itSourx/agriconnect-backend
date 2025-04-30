"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const dotenv = require("dotenv");
const products_service_1 = require("../products/products.service");
const users_service_1 = require("../users/users.service");
const date_fns_1 = require("date-fns");
const pdfMake = require("pdfmake/build/pdfmake");
const pdfFonts = require("pdfmake/build/vfs_fonts");
const nodemailer = require("nodemailer");
const buffer_1 = require("buffer");
dotenv.config();
let OrdersService = class OrdersService {
    constructor(productsService, usersService) {
        this.productsService = productsService;
        this.usersService = usersService;
        this.apiKey = process.env.AIRTABLE_API_KEY;
        this.baseId = process.env.AIRTABLE_BASE_ID;
        this.tableName = process.env.AIRTABLE_ORDERS_TABLE;
    }
    getHeaders() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
    }
    getUrl() {
        return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
    }
    async findAll(page = 1, perPage = 10) {
        const offset = (page - 1) * perPage;
        const response = await axios_1.default.get(this.getUrl(), {
            headers: this.getHeaders(),
            params: {
                pageSize: perPage,
                offset: offset > 0 ? offset.toString() : undefined,
            },
        });
        return response.data.records;
    }
    async findOne(id) {
        try {
            const response = await axios_1.default.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la récupération de la commande :', error.response?.data || error.message);
            throw new Error('Commande introuvable.');
        }
    }
    async create(data) {
        try {
            const formattedData = {
                buyer: data.buyerId,
                products: data.products.map(product => product.id),
                totalPrice: 0,
                Qty: data.products.map(product => product.quantity).join(' , '),
                farmerPayments: '',
                orderNumber: data.orderNumber,
            };
            let totalPrice = 0;
            for (const product of data.products) {
                const productRecord = await this.productsService.findOne(product.id);
                totalPrice += productRecord.fields.price * product.quantity;
            }
            formattedData.totalPrice = totalPrice;
            const productIds = data.products.map(product => product.id);
            const quantities = data.products.map(product => product.quantity);
            const farmerPayments = await this.calculateFarmerPayments(productIds, quantities);
            formattedData.farmerPayments = JSON.stringify(farmerPayments);
            const orderNumber = Math.floor(10000 + Math.random() * 90000).toString();
            formattedData.orderNumber = orderNumber;
            console.log('Données formatées pour Airtable :', formattedData);
            const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: formattedData }] }, { headers: this.getHeaders() });
            console.log('Commande créée avec succès :', response.data);
            return response.data.records[0];
        }
        catch (error) {
            console.error('Erreur lors de la création de la commande :', error.response?.data || error.message);
            throw error;
        }
    }
    async update(id, data) {
        try {
            const existingOrder = await this.findOne(id);
            if (!existingOrder) {
                throw Error('Commande introuvable.');
            }
            const currentStatus = existingOrder.fields.status;
            if (currentStatus !== 'pending') {
                throw Error('Impossible de modifier une commande déjà traitée.');
            }
            const formattedData = {
                products: data.products.map(product => product.id),
                Qty: data.products.map(product => product.quantity).join(' , '),
                status: data.status || 'pending',
                totalPrice: 0,
            };
            let totalPrice = 0;
            for (const product of data.products) {
                const productRecord = await this.productsService.findOne(product.id);
                totalPrice += productRecord.fields.price * product.quantity;
            }
            formattedData.totalPrice = totalPrice;
            console.log('Données formatées pour la mise à jour :', formattedData);
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: formattedData }, { headers: this.getHeaders() });
            console.log('Commande mise à jour avec succès :', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour de la commande :', error.response?.data || error.message);
            throw error;
        }
    }
    async delete(id) {
        try {
            const response = await axios_1.default.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la suppression de la commande :', error);
            throw new Error('Impossible de supprimer la commande.');
        }
    }
    async updateStatus(id, status) {
        try {
            const existingOrder = await this.findOne(id);
            if (!existingOrder) {
                throw Error('Commande introuvable.');
            }
            const currentStatus = existingOrder.fields.status;
            const allowedStatusTransitions = {
                pending: ['confirmed'],
                confirmed: ['delivered'],
                delivered: ['completed'],
            };
            if (!allowedStatusTransitions[currentStatus]?.includes(status)) {
                throw Error(`Impossible de passer la commande de "${currentStatus}" à "${status}".`);
            }
            console.log(`Transition de statut autorisée : "${currentStatus}" → "${status}"`);
            if (status === 'confirmed') {
                let products = existingOrder.fields.products;
                let quantities = existingOrder.fields.Qty;
                let mesurements = existingOrder.fields.mesure;
                console.log('Produits avant normalisation :', products);
                console.log('Quantités avant normalisation :', quantities);
                if (typeof products === 'string') {
                    try {
                        products = JSON.parse(products);
                    }
                    catch (error) {
                        products = [products];
                    }
                }
                else if (!Array.isArray(products)) {
                    products = [products];
                }
                if (typeof quantities === 'string') {
                    try {
                        quantities = JSON.parse(quantities);
                    }
                    catch (error) {
                        if (quantities.includes(',')) {
                            quantities = quantities.split(',').map(qty => qty.trim());
                        }
                        else {
                            quantities = [quantities];
                        }
                    }
                }
                else if (typeof quantities === 'number') {
                    quantities = [quantities];
                }
                else if (!Array.isArray(quantities)) {
                    quantities = [quantities];
                }
                if (!Array.isArray(quantities)) {
                    quantities = [quantities];
                }
                console.log('Produits après normalisation :', products);
                console.log('Quantités après normalisation :', quantities);
                quantities = quantities.map(Number);
                if (products.length !== quantities.length) {
                    throw Error('Les données de la commande sont incohérentes.');
                }
                for (let i = 0; i < products.length; i++) {
                    const productId = products[i];
                    const quantity = quantities[i];
                    await this.productsService.updateStock(productId, quantity);
                }
                const farmerPayments = await this.calculateFarmerPayments(products, quantities);
                const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, {
                    fields: {
                        status,
                        farmerPayments: JSON.stringify(farmerPayments),
                    },
                }, { headers: this.getHeaders() });
                console.log('Statut de la commande mis à jour avec succès :', response.data);
                return response.data;
            }
            else {
                const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, {
                    fields: {
                        status,
                    },
                }, { headers: this.getHeaders() });
                console.log('Statut de la commande mis à jour avec succès :', response.data);
                return response.data;
            }
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du statut de la commande :', error.message);
            throw error;
        }
    }
    async calculateFarmerPayments(products, quantities) {
        const farmerPayments = {};
        for (let i = 0; i < products.length; i++) {
            const productId = products[i];
            const quantity = quantities[i];
            const product = await this.productsService.findOne(productId);
            if (!product) {
                throw Error(`Produit avec l'ID ${productId} introuvable.`);
            }
            const farmerId = product.fields.farmerId[0];
            const price = product.fields.price || 0;
            const lib = product.fields.Name;
            const mesure = product.fields.mesure;
            const category = product.fields.category;
            const farmer = await this.usersService.findOne(farmerId);
            const name = farmer.fields.name || 'Nom inconnu';
            const farmerEmail = farmer.fields.email || 'Email inconnu';
            const totalAmount = price * quantity;
            if (!farmerPayments[farmerId]) {
                farmerPayments[farmerId] = {
                    farmerId,
                    name: name,
                    email: farmerEmail,
                    totalAmount: 0,
                    totalProducts: 0,
                    products: [],
                };
            }
            farmerPayments[farmerId].totalAmount += totalAmount;
            farmerPayments[farmerId].totalProducts += 1;
            farmerPayments[farmerId].products.push({
                productId,
                lib,
                category,
                quantity,
                price,
                mesure,
                total: totalAmount,
            });
        }
        return Object.values(farmerPayments);
    }
    async getOrdersByFarmer(farmerId) {
        try {
            const response = await axios_1.default.get(this.getUrl(), { headers: this.getHeaders() });
            const orders = response.data.records;
            const farmerOrders = [];
            for (const order of orders) {
                const orderId = order.id;
                const fields = order.fields;
                if (!fields.farmerPayments)
                    continue;
                let farmerPayments;
                try {
                    farmerPayments = JSON.parse(fields.farmerPayments);
                }
                catch (error) {
                    console.error(`Erreur lors du parsing de farmerPayments pour la commande ${orderId}`);
                    continue;
                }
                const farmerPayment = farmerPayments.find(payment => payment.farmerId === farmerId);
                if (farmerPayment) {
                    const rawDate = fields.createdAt;
                    const formattedDate = rawDate ? (0, date_fns_1.format)(new Date(rawDate), 'dd/MM/yyyy HH:mm') : 'Date inconnue';
                    const rawStatusDate = fields.statusDate;
                    const formattedStatusDate = rawStatusDate ? (0, date_fns_1.format)(new Date(rawStatusDate), 'dd/MM/yyyy HH:mm') : 'Date inconnue';
                    farmerOrders.push({
                        orderId,
                        buyer: fields.buyerName,
                        totalAmount: farmerPayment.totalAmount,
                        status: fields.status,
                        createdDate: formattedDate,
                        statusDate: formattedStatusDate,
                        totalProducts: farmerPayment.totalProducts,
                        products: farmerPayment.products,
                    });
                }
            }
            return farmerOrders;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des commandes pour l\'agriculteur :', error.response?.data || error.message);
            throw error;
        }
    }
    async getOrderPayments(orderId) {
        try {
            const existingOrder = await this.findOne(orderId);
            if (!existingOrder) {
                throw new Error('Commande introuvable.');
            }
            const farmerPayments = existingOrder.fields.farmerPayments;
            if (!farmerPayments) {
                throw new Error('Aucun détail de paiement trouvé pour cette commande.');
            }
            let parsedPayments;
            try {
                parsedPayments = JSON.parse(farmerPayments);
            }
            catch (error) {
                throw new Error('Le format des détails de paiement est incorrect.');
            }
            return parsedPayments;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des détails de paiement :', error.message);
            throw error;
        }
    }
    loadPdfFonts() {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
    }
    async loadImageAsBase64(imageUrl) {
        try {
            const response = await axios_1.default.get(imageUrl, { responseType: 'arraybuffer' });
            return `data:image/jpeg;base64,${buffer_1.Buffer.from(response.data).toString('base64')}`;
        }
        catch (error) {
            console.error(`Image loading error: ${imageUrl}`, error);
            return '';
        }
    }
    async generateInvoice(orderId) {
        this.loadPdfFonts();
        try {
            const existingOrder = await this.findOne(orderId);
            if (!existingOrder)
                throw new Error('Order not found');
            const copyrightText = `© ${new Date().getFullYear()} SOURX Ltd`;
            const orderDetails = existingOrder.fields;
            const buyerName = orderDetails.buyerName || 'Unknown Client';
            const buyerCompany = orderDetails.buyerCompany || '';
            const buyerPhone = orderDetails.buyerPhone || '';
            const buyerEmail = orderDetails.buyerEmail || '';
            const buyerAddress = orderDetails.buyerAddress || '';
            const orderNumber = orderDetails.orderNumber || 'N/A';
            const customerRef = orderDetails.customerRef || 'N/A';
            const products = orderDetails.products || [];
            const quantities = orderDetails.Qty || [];
            const normalizedProducts = Array.isArray(products) ? products : [products];
            let normalizedQuantities = Array.isArray(quantities)
                ? quantities.map(Number)
                : [Number(quantities)];
            if (typeof quantities === 'string') {
                normalizedQuantities = quantities.split(',').map(qty => {
                    const parsedQty = Number(qty.trim());
                    return isNaN(parsedQty) ? 0 : parsedQty;
                });
            }
            if (normalizedProducts.length !== normalizedQuantities.length) {
                throw new Error('Inconsistent order data');
            }
            const formattedDate = orderDetails.createdAt
                ? (0, date_fns_1.format)(new Date(orderDetails.createdAt), 'dd/MM/yyyy')
                : 'Unknown date';
            const taxRate = 0.20;
            let totalPrice = 0;
            let taxTotal = 0;
            const bodyRows = [];
            const productsByCategory = {};
            for (let i = 0; i < normalizedProducts.length; i++) {
                const productId = normalizedProducts[i];
                const product = await this.productsService.findOne(productId);
                const category = product?.fields.category || 'Uncategorized';
                const productData = {
                    productId,
                    productName: product?.fields.Name || 'Unknown Product',
                    photoUrl: product?.fields.Photo?.[0]?.url || '',
                    price: product?.fields.price || 0,
                    quantity: normalizedQuantities[i],
                    category
                };
                if (!productsByCategory[category]) {
                    productsByCategory[category] = [];
                }
                productsByCategory[category].push(productData);
            }
            for (const [category, products] of Object.entries(productsByCategory)) {
                bodyRows.push([
                    {
                        text: category.toUpperCase(),
                        colSpan: 6,
                        style: 'categoryRow',
                        margin: [0, 10, 0, 5]
                    },
                    '', '', '', '', ''
                ]);
                for (const product of products) {
                    const imageBase64 = product.photoUrl ? await this.loadImageAsBase64(product.photoUrl) : '';
                    const subtotalForProduct = product.price * product.quantity;
                    const taxForProduct = subtotalForProduct * taxRate;
                    const totalIncTax = subtotalForProduct + taxForProduct;
                    totalPrice += subtotalForProduct;
                    taxTotal += taxForProduct;
                    bodyRows.push([
                        {
                            columns: [
                                {
                                    image: imageBase64 || '',
                                    width: 30,
                                    height: 30,
                                    fit: [30, 30],
                                    alignment: 'center',
                                    margin: [0, 5, 0, 5],
                                    ...(!imageBase64 && { text: ' ', italics: true })
                                },
                                {
                                    stack: [
                                        { text: product.productName, bold: true, margin: [10, 0, 0, 0] },
                                        { text: `Ref: ${product.productId}`, fontSize: 8, color: '#666', margin: [10, 2, 0, 0] }
                                    ],
                                    margin: [10, 5, 0, 5],
                                    width: '*'
                                }
                            ]
                        },
                        {
                            text: product.quantity.toString(),
                            alignment: 'center',
                            margin: [0, 5, 0, 5]
                        },
                        {
                            text: product.price.toString(),
                            alignment: 'center',
                            margin: [0, 5, 0, 5]
                        },
                        {
                            text: subtotalForProduct.toFixed(2),
                            alignment: 'center',
                            margin: [0, 5, 0, 5]
                        },
                        {
                            text: taxForProduct.toFixed(2),
                            alignment: 'center',
                            margin: [0, 5, 0, 5]
                        },
                        {
                            text: totalIncTax.toFixed(2),
                            alignment: 'center',
                            margin: [0, 5, 0, 5]
                        }
                    ]);
                }
            }
            const totalWithTax = totalPrice + taxTotal;
            const logoBase64 = await this.loadImageAsBase64('https://sourx.com/wp-content/uploads/2023/08/logo-agriconnect.png');
            const content = [];
            const header = {
                columns: [
                    {
                        stack: [
                            { text: 'SOURX LIMITED', style: 'header', margin: [0, -5, 0, 2] },
                            { text: '71-75 Shelton Street Covent Garden', margin: [0, 0, 0, 2] },
                            { text: 'London WC2H 9JQ', margin: [0, 0, 0, 2] },
                            { text: 'VAT Registration No: 438434679', margin: [0, 0, 0, 2] },
                            { text: 'Registered in England No : 08828978', margin: [0, 0, 0, 0] }
                        ],
                        width: '70%',
                        margin: [0, 10, 0, 0],
                    },
                    {
                        image: logoBase64 || 'agriConnect',
                        width: 120,
                        alignment: 'right',
                        margin: [0, 0, 0, 0]
                    }
                ],
                columnGap: 20,
                margin: [0, 0, 0, 30]
            };
            content.push(header);
            const customerInfo = {
                columns: [
                    {
                        stack: [
                            { text: 'Customer info:', style: 'sectionHeader' },
                            { text: `Name: ${buyerName}`, margin: [0, 0, 0, 5] },
                            { text: `Company: ${buyerCompany}`, margin: [0, 0, 0, 5] },
                            { text: `Phone: ${buyerPhone}`, margin: [0, 0, 0, 5] },
                            { text: `Email: ${buyerEmail}`, margin: [0, 0, 0, 5] },
                            { text: `Address: ${buyerAddress}`, margin: [0, 0, 0, 5] }
                        ],
                        width: '50%'
                    },
                    {
                        stack: [
                            { text: 'Summary :', style: 'sectionHeader', alignment: 'right' },
                            {
                                table: {
                                    widths: ['auto', '*'],
                                    body: [
                                        [
                                            { text: 'Order number:', style: 'infoLabel' },
                                            { text: orderNumber, style: 'infoValue' }
                                        ],
                                        [
                                            { text: 'Date:', style: 'infoLabel' },
                                            { text: formattedDate, style: 'infoValue' }
                                        ],
                                        [
                                            { text: 'Amount:', style: 'infoLabel' },
                                            { text: `${totalWithTax.toFixed(2)} FCFA`, style: 'infoValue' }
                                        ],
                                        [
                                            { text: 'Customer Ref.:', style: 'infoLabel' },
                                            { text: customerRef, style: 'infoValue' }
                                        ]
                                    ]
                                },
                                layout: {
                                    hLineWidth: () => 0,
                                    vLineWidth: () => 0,
                                    paddingTop: () => 5,
                                    paddingBottom: () => 5
                                },
                                fillColor: '#F5F5F5',
                                margin: [0, 10, 0, 0]
                            }
                        ],
                        width: '50%'
                    }
                ],
                columnGap: 10,
                margin: [0, 0, 0, 20]
            };
            content.push(customerInfo);
            const productsTable = {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                    body: [
                        [
                            { text: 'Product', style: 'tableHeader', margin: [0, 5, 0, 5] },
                            { text: 'Qty', style: 'tableHeader', margin: [0, 5, 0, 5] },
                            { text: 'Price', style: 'tableHeader', margin: [0, 5, 0, 5] },
                            { text: 'Total', style: 'tableHeader', margin: [0, 5, 0, 5] },
                            { text: 'Tax', style: 'tableHeader', margin: [0, 5, 0, 5] },
                            { text: 'Total(inc. tax)', style: 'tableHeader', margin: [0, 5, 0, 5] }
                        ],
                        ...bodyRows
                    ]
                },
                layout: 'headerLineOnly',
                margin: [0, 0, 0, 20]
            };
            content.push(productsTable);
            const totals = {
                stack: [
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 555 - 40, y2: 0, lineWidth: 1 }] },
                    { text: `Subtotal: ${totalPrice.toFixed(2)} FCFA`, alignment: 'right', margin: [5, 10, 0, 5] },
                    { text: `Tax: ${taxTotal.toFixed(2)} FCFA`, alignment: 'right', margin: [0, 0, 0, 5] },
                    { text: `Total: ${totalWithTax.toFixed(2)} FCFA`, bold: true, alignment: 'right', margin: [0, 0, 0, 10] }
                ]
            };
            content.push(totals);
            const docDefinition = {
                content,
                footer: (currentPage, pageCount) => ({
                    text: `Page ${currentPage} of ${pageCount} | Thank you for your purchase! ${copyrightText}`,
                    alignment: 'center',
                    fontSize: 9,
                    margin: [10, 10, 0, 0]
                }),
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        color: '#009cdb',
                        margin: [0, 0, 0, 10]
                    },
                    sectionHeader: {
                        fontSize: 14,
                        bold: true,
                        color: '#8b6404',
                        margin: [0, 0, 0, 10]
                    },
                    tableHeader: {
                        bold: true,
                        fontSize: 11,
                        color: '#FFFFFF',
                        fillColor: '#4CAF50',
                        alignment: 'center'
                    },
                    categoryRow: {
                        bold: true,
                        fontSize: 12,
                        color: '#FF9800',
                        fillColor: '#F5F5F5',
                        margin: [0, 5, 0, 10]
                    },
                    infoValue: {
                        alignment: 'right',
                        margin: [0, 3, 0, 3]
                    }
                },
                defaultStyle: {
                    font: 'Roboto',
                    fontSize: 10
                },
                pageSize: 'A4',
                pageMargins: [40, 40, 40, 60]
            };
            return new Promise((resolve, reject) => {
                pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
                    buffer ? resolve(buffer) : reject(new Error('PDF generation failed'));
                });
            });
        }
        catch (error) {
            console.error('Invoice generation error:', error);
            throw error;
        }
    }
    async sendInvoiceByEmail(orderId, buyerEmail) {
        try {
            const pdfBuffer = await this.generateInvoice(orderId);
            const existingOrder = await this.findOne(orderId);
            const orderNumber = existingOrder.fields.orderNumber;
            const fileName = `invoice_${orderNumber}.pdf`;
            const transporter = nodemailer.createTransport({
                host: 'mail.sourx.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: buyerEmail,
                subject: `Votre facture - Commande #${orderNumber}`,
                text: `Bonjour,\n\nVeuillez trouver ci-joint votre facture pour la commande #${orderNumber}.`,
                attachments: [
                    {
                        filename: fileName,
                        content: pdfBuffer,
                    },
                ],
            };
            await transporter.sendMail(mailOptions);
            console.log(`Facture envoyée avec succès à ${buyerEmail}`);
        }
        catch (error) {
            console.error('Erreur lors de l\'envoi de la facture par e-mail :', error.message);
            throw error;
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        users_service_1.UsersService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map