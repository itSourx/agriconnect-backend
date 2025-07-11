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
    async batchGetOrderPayments(orderIds) {
        return Promise.all(orderIds.map(id => this.getOrderPayments(id).catch(e => null)));
    }
    async findAll() {
        try {
            console.log('Récupération de toutes les commandes...');
            let allRecords = [];
            let offset = undefined;
            do {
                const response = await axios_1.default.get(this.getUrl(), {
                    headers: this.getHeaders(),
                    params: {
                        pageSize: 100,
                        offset: offset,
                    },
                });
                allRecords = allRecords.concat(response.data.records);
                offset = response.data.offset;
            } while (offset);
            console.log(`Nombre total d'enregistrements récupérés : ${allRecords.length}`);
            return allRecords;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des enregistrements :', error.message);
            throw error;
        }
    }
    async findOne(id) {
        try {
            const response = await axios_1.default.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la récupération de la commande :', error.response?.data || error.message);
            throw error;
        }
    }
    async getOrderById(orderId) {
        const response = await axios_1.default.get(`${this.getUrl()}/${orderId}`, { headers: this.getHeaders() });
        const order = response.data;
        if (!order) {
            throw new Error('Commande non trouvée.');
        }
        const fields = order.fields;
        return {
            id: order.id,
            createdTime: order.createdTime,
            status: fields.status,
            totalPrice: fields.totalPrice,
            products: fields.products || [],
            farmerProfile: fields.farmerProfile || [],
            farmerLastName: fields.farmerLastName || [],
            farmerFirstName: fields.farmerFirstName || [],
            farmerId: fields.farmerId || [],
            buyer: fields.buyer || [],
            buyerAddress: fields.buyerAddress || [],
            buyerPhone: fields.buyerPhone || [],
            buyerLastName: fields.buyerLastName || [],
            buyerFirstName: fields.buyerFirstName || [],
            profileBuyer: fields.profileBuyer || [],
            buyerId: fields.buyerId || [],
        };
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
                payStatus: data.payStatus,
                transaction_id: data.transaction_id,
                totalPaid: data.totalPaid,
            };
            let totalPrice = 0;
            for (const product of data.products) {
                const productRecord = await this.productsService.findOne(product.id);
                totalPrice += productRecord.fields.price * product.quantity;
            }
            const taxAmount = totalPrice * 0.18;
            const totalWithTax = totalPrice + taxAmount;
            console.log('Le montant envoyé :', formattedData.totalPaid, 'Total calculé est :', totalWithTax);
            if (totalWithTax !== formattedData.totalPaid) {
                throw new Error('Le montant total n\'est pas correct.');
            }
            formattedData.totalPrice = totalPrice;
            const productIds = data.products.map(product => product.id);
            const quantities = data.products.map(product => product.quantity);
            const farmerPayments = await this.calculateFarmerPayments(productIds, quantities);
            formattedData.farmerPayments = JSON.stringify(farmerPayments);
            const orderNumber = Math.floor(10000 + Math.random() * 90000).toString();
            formattedData.orderNumber = orderNumber;
            formattedData.payStatus = 'PAID';
            console.log('Données formatées pour Airtable :', formattedData);
            const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: formattedData }] }, { headers: this.getHeaders() });
            const createdOrder = response.data.records[0];
            const orderId = createdOrder.id;
            const buyerEmail = createdOrder.fields.buyerEmail;
            if (buyerEmail) {
                try {
                    await this.sendInvoiceByEmail(orderId, buyerEmail);
                    console.log('Email de facture envoyé avec succès à', buyerEmail);
                }
                catch (emailError) {
                    console.error("Erreur lors de l'envoi de l'email de facture:", emailError);
                }
            }
            else {
                console.warn("Aucun email d'acheteur fourni, l'email de facture ne sera pas envoyé");
            }
            return createdOrder;
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
    async updateFarmerPayment(id, data) {
        try {
            console.log('Données reçues dans le service :', data);
            if (!data || !data.farmerPayment) {
                throw new Error('Le champ farmerPayment est manquant ou invalide.');
            }
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: data }, { headers: this.getHeaders() });
            console.log('Réponse d\'Airtable après mise à jour :', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour de la commande :', error.message);
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
            const zone = product.fields.location;
            const Photo = (product.fields.Photo || []).map(p => p.url);
            const farmer = await this.usersService.findOne(farmerId);
            const name = farmer.fields.name || 'Nom inconnu';
            const farmerEmail = farmer.fields.email || 'Email inconnu';
            const compteOwo = farmer.fields.compteOwo || 'NOT SET';
            const totalAmount = price * quantity;
            if (!farmerPayments[farmerId]) {
                farmerPayments[farmerId] = {
                    farmerId,
                    name: name,
                    email: farmerEmail,
                    compteOwo: compteOwo,
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
                zone,
                total: totalAmount,
                Photo,
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
                    if (typeof fields.farmerPayments === 'string') {
                        const safeJson = fields.farmerPayments.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
                        farmerPayments = JSON.parse(safeJson);
                    }
                    else if (Array.isArray(fields.farmerPayments)) {
                        farmerPayments = fields.farmerPayments;
                    }
                    else {
                        console.warn(`Format inattendu de farmerPayments pour la commande ${orderId}:`, fields.farmerPayments);
                        continue;
                    }
                }
                catch (error) {
                    console.error(`Erreur lors du parsing de farmerPayments pour la commande ${orderId}:`, error.message);
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
                        orderNumber: fields.orderNumber,
                        buyerName: fields.buyerName,
                        buyerEmail: fields.buyerEmail,
                        buyerPhone: fields.buyerPhone,
                        buyerPhoto: fields.buyerPhoto,
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
    parseFarmerPayments(farmerPayments) {
        try {
            if (!farmerPayments)
                return [];
            if (Array.isArray(farmerPayments))
                return farmerPayments;
            if (typeof farmerPayments === 'string') {
                try {
                    const parsed = JSON.parse(farmerPayments);
                    return Array.isArray(parsed) ? parsed : [parsed];
                }
                catch {
                    return [];
                }
            }
            if (typeof farmerPayments === 'object')
                return [farmerPayments];
            return [];
        }
        catch (error) {
            console.error('Erreur de parsing:', error);
            return [];
        }
    }
    async getOrderPayments(orderId) {
        try {
            const existingOrder = await this.findOne(orderId);
            if (!existingOrder)
                throw new Error('Commande introuvable');
            const farmerPayments = existingOrder.fields.farmerPayments;
            if (!farmerPayments)
                return [];
            if (Array.isArray(farmerPayments))
                return farmerPayments;
            if (typeof farmerPayments === 'string') {
                try {
                    const safeJson = farmerPayments.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
                    const parsed = JSON.parse(safeJson);
                    return Array.isArray(parsed) ? parsed : [parsed];
                }
                catch (error) {
                    console.error(`Erreur de parsing JSON pour orderId=${orderId}:`, error.message);
                    return [];
                }
            }
            if (typeof farmerPayments === 'object')
                return [farmerPayments];
            return [];
        }
        catch (error) {
            console.error(`Erreur critique: ${error.message}`);
            return [];
        }
    }
    loadPdfFonts() {
        const fontFiles = {
            ...pdfFonts.pdfMake?.vfs,
        };
        pdfMake.vfs = fontFiles;
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
            const taxRate = 0.18;
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
                    { text: '' },
                    { text: '' },
                    { text: '' },
                    { text: '' },
                    { text: '' }
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
                            { text: 'Product', style: 'tableHeader', margin: [0, 5, 0, 0] },
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
                margin: [0, 0, 0, 10]
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
                    infoLabel: {
                        bold: true,
                        margin: [0, 3, 0, 3]
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
    async getFarmerClients(farmerId) {
        try {
            const farmerOrders = await this.getOrdersByFarmer(farmerId);
            console.log('Commandes récupérées pour l\'agriculteur :', JSON.stringify(farmerOrders, null, 2));
            const clientStats = new Map();
            for (const order of farmerOrders) {
                console.log(`Traitement de la commande :`, order);
                if (!order || !Array.isArray(order.buyerName) || !Array.isArray(order.buyerEmail)) {
                    console.warn('Commande invalide ignorée :', order);
                    continue;
                }
                const buyerName = order.buyerName.length > 0 ? order.buyerName[0] : '';
                const buyerEmail = order.buyerEmail.length > 0 ? order.buyerEmail[0] : '';
                const buyerPhone = (order.buyerPhone || []).length > 0 ? order.buyerPhone[0] : '';
                const buyerPhoto = (order.buyerPhoto || []).length > 0 ? order.buyerPhoto[0] : '';
                const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
                console.log(`buyerName extrait : "${buyerName}", buyerEmail extrait : "${buyerEmail}",buyerPhone extrait : "${buyerPhone}", buyerPhoto extrait : "${buyerPhoto}", totalAmount : ${totalAmount}`);
                if (buyerName && buyerEmail) {
                    if (clientStats.has(buyerEmail)) {
                        const client = clientStats.get(buyerEmail);
                        client.orderCount += 1;
                        client.totalSpent += totalAmount;
                        for (const productItem of order.products) {
                            const productId = productItem.productId;
                            const productName = productItem.lib;
                            const productCategory = productItem.category;
                            const productMesure = productItem.mesure;
                            const productQuantity = productItem.quantity;
                            const productPrice = productItem.price;
                            const productTotal = productItem.total;
                            const foundProduct = await this.productsService.findOne(productId);
                            if (foundProduct.fields.farmerId.includes(farmerId)) {
                                if (!client.products[productName]) {
                                    client.products[productName] = {
                                        productId,
                                        category: productCategory,
                                        totalQuantity: 0,
                                        totalSpent: 0,
                                        purchaseCount: 0,
                                    };
                                }
                                client.products[productName].totalQuantity += productQuantity;
                                client.products[productName].totalSpent += productTotal;
                                client.products[productName].purchaseCount += 1;
                            }
                        }
                        if (!client.firstOrderDate || new Date(order.createdDate) < new Date(client.firstOrderDate)) {
                            client.firstOrderDate = order.createdDate;
                        }
                        if (order.status === 'pending') {
                            client.statusDistribution.pending += 1;
                        }
                        else if (order.status === 'confirmed') {
                            client.statusDistribution.confirmed += 1;
                        }
                        else if (order.status === 'delivered') {
                            client.statusDistribution.delivered += 1;
                        }
                        else if (order.status === 'completed') {
                            client.statusDistribution.completed += 1;
                        }
                    }
                    else {
                        const products = {};
                        for (const productItem of order.products) {
                            const productId = productItem.productId;
                            const productName = productItem.lib;
                            const productCategory = productItem.category;
                            const productMesure = productItem.mesure;
                            const productQuantity = productItem.quantity;
                            const productPrice = productItem.price;
                            const productTotal = productItem.total;
                            const foundProduct = await this.productsService.findOne(productId);
                            if (foundProduct.fields.farmerId.includes(farmerId)) {
                                products[productName] = {
                                    productId,
                                    category: productCategory,
                                    totalQuantity: productQuantity,
                                    totalSpent: productTotal,
                                    purchaseCount: 1,
                                };
                            }
                        }
                        clientStats.set(buyerEmail, {
                            buyerName,
                            buyerEmail,
                            buyerPhone,
                            buyerPhoto,
                            orderCount: 1,
                            totalSpent: totalAmount,
                            firstOrderDate: order.createdDate,
                            products: products,
                            statusDistribution: {
                                pending: order.status === 'pending' ? 1 : 0,
                                confirmed: order.status === 'confirmed' ? 1 : 0,
                                delivered: order.status === 'delivered' ? 1 : 0,
                                completed: order.status === 'completed' ? 1 : 0,
                            },
                        });
                    }
                }
            }
            return Array.from(clientStats.values());
        }
        catch (error) {
            console.error('Erreur lors de la récupération des clients de l\'agriculteur :', error.message);
            throw error;
        }
    }
    async calculateOrderStats(orders) {
        const productStats = {};
        let globalTotal = 0;
        await Promise.all(orders.map(async (order) => {
            const payments = await this.getOrderPayments(order.id);
            const productsInOrder = new Set();
            payments.forEach(payment => {
                payment.products.forEach(product => {
                    if (!product.productId)
                        return;
                    if (!productStats[product.productId]) {
                        productStats[product.productId] = {
                            orderCount: 0,
                            productName: product.lib || 'Inconnu',
                            category: product.category || 'Non catégorisé',
                            mesure: product.mesure || 'Non défini',
                            totalQuantity: 0,
                            totalRevenue: 0
                        };
                    }
                    if (!productsInOrder.has(product.productId)) {
                        productStats[product.productId].orderCount++;
                        productsInOrder.add(product.productId);
                    }
                    productStats[product.productId].totalQuantity += product.quantity || 0;
                    productStats[product.productId].totalRevenue += product.total || 0;
                    globalTotal += product.total || 0;
                });
            });
        }));
        const statsArray = Object.entries(productStats).map(([productId, stats]) => ({
            productId,
            ...stats,
            percentageOfTotal: globalTotal > 0 ? (stats.totalRevenue / globalTotal) * 100 : 0,
            percentageOfOrders: orders.length > 0 ? (stats.orderCount / orders.length) * 100 : 0
        }));
        const sortedStats = statsArray.sort((a, b) => b.totalQuantity - a.totalQuantity);
        const sortedStatsRevenue = statsArray.sort((a, b) => b.totalRevenue - a.totalRevenue);
        return {
            totalOrders: orders.length,
            totalProducts: Object.keys(productStats).length,
            globalTotalRevenue: globalTotal,
            products: sortedStatsRevenue
        };
    }
    async calculateFarmerStats(orders) {
        const farmerStats = {};
        let globalTotalRevenue = 0;
        await Promise.all(orders.map(async (order) => {
            try {
                const payments = await this.getOrderPayments(order.id);
                const orderDate = new Date(order.createdAt || order.fields?.date || new Date()).toISOString().split('T')[0];
                for (const payment of payments) {
                    const farmerId = payment.farmerId;
                    if (!farmerId)
                        continue;
                    if (!farmerStats[farmerId]) {
                        farmerStats[farmerId] = {
                            farmerName: payment.name || 'Inconnu',
                            farmerEmail: payment.email || '',
                            totalOrders: 0,
                            totalProducts: 0,
                            totalRevenue: 0,
                            products: {}
                        };
                    }
                    farmerStats[farmerId].totalOrders++;
                    for (const product of payment.products || []) {
                        if (!product.productId)
                            continue;
                        const productRef = farmerStats[farmerId].products[product.productId];
                        if (!productRef) {
                            farmerStats[farmerId].products[product.productId] = {
                                name: product.lib || 'Inconnu',
                                category: product.category || 'Inconnue',
                                price: typeof product.price === 'number' ? product.price : 0,
                                quantity: 0,
                                revenue: 0,
                                lastSoldDate: orderDate
                            };
                            farmerStats[farmerId].totalProducts++;
                        }
                        const productStats = farmerStats[farmerId].products[product.productId];
                        const quantity = product.quantity || 0;
                        const revenue = product.total || 0;
                        productStats.quantity += quantity;
                        productStats.revenue += revenue;
                        productStats.lastSoldDate = orderDate;
                        farmerStats[farmerId].totalRevenue += revenue;
                        globalTotalRevenue += revenue;
                    }
                }
            }
            catch (error) {
                console.error(`Erreur commande ${order.id}:`, error.message);
            }
        }));
        const farmersArray = Object.entries(farmerStats).map(([farmerId, stats]) => ({
            farmerId,
            ...stats,
            percentageOfTotalRevenue: globalTotalRevenue > 0
                ? parseFloat(((stats.totalRevenue / globalTotalRevenue) * 100).toFixed(2))
                : 0
        }));
        return {
            totalFarmers: Object.keys(farmerStats).length,
            globalTotalRevenue,
            farmers: farmersArray.sort((a, b) => b.totalRevenue - a.totalRevenue)
        };
    }
    async calculateBuyerStats(orders) {
        const buyerStats = {};
        let globalTotalRevenue = 0;
        await Promise.all(orders.map(async (order) => {
            try {
                const buyerId = order.fields.buyerId[0];
                if (!buyerId)
                    return;
                if (!buyerStats[buyerId]) {
                    buyerStats[buyerId] = {
                        buyerName: order.fields.buyerName[0] || 'Acheteur inconnu',
                        buyerEmail: order.fields.buyerEmail[0] || '',
                        totalOrders: 0,
                        totalProducts: 0,
                        totalSpent: 0,
                        favoriteCategory: '',
                        products: {},
                        categories: {}
                    };
                }
                buyerStats[buyerId].totalOrders++;
                const payments = await this.getOrderPayments(order.id);
                payments.forEach(payment => {
                    payment.products.forEach(product => {
                        if (!product.productId)
                            return;
                        if (!buyerStats[buyerId].products[product.productId]) {
                            buyerStats[buyerId].products[product.productId] = {
                                name: product.lib || 'Inconnu',
                                category: product.category || 'Inconnue',
                                price: product.price || 'Inconnue',
                                quantity: 0,
                                amount: 0
                            };
                            buyerStats[buyerId].totalProducts++;
                        }
                        buyerStats[buyerId].products[product.productId].quantity += product.quantity || 0;
                        buyerStats[buyerId].products[product.productId].amount += product.total || 0;
                        const category = product.category || 'Non catégorisé';
                        if (!buyerStats[buyerId].categories[category]) {
                            buyerStats[buyerId].categories[category] = {
                                quantity: 0,
                                amount: 0
                            };
                        }
                        buyerStats[buyerId].categories[category].quantity += product.quantity || 0;
                        buyerStats[buyerId].categories[category].amount += product.total || 0;
                        buyerStats[buyerId].totalSpent += product.total || 0;
                        globalTotalRevenue += product.total || 0;
                    });
                });
                if (Object.keys(buyerStats[buyerId].categories).length > 0) {
                    buyerStats[buyerId].favoriteCategory = Object.entries(buyerStats[buyerId].categories)
                        .sort((a, b) => b[1].amount - a[1].amount)[0][0];
                }
            }
            catch (error) {
                console.error(`Erreur commande ${order.id}:`, error.message);
            }
        }));
        const buyersArray = Object.entries(buyerStats).map(([buyerId, stats]) => ({
            buyerId,
            ...stats,
            percentageOfTotalSpent: globalTotalRevenue > 0 ?
                (stats.totalSpent / globalTotalRevenue) * 100 : 0,
            categoryStats: Object.entries(stats.categories).map(([category, data]) => ({
                category,
                ...data,
                percentage: (data.amount / stats.totalSpent) * 100
            }))
        }));
        return {
            totalBuyers: Object.keys(buyerStats).length,
            globalTotalRevenue,
            buyers: buyersArray.sort((a, b) => b.totalSpent - a.totalSpent)
        };
    }
    async calculateSingleBuyerStats(buyerId, orders) {
        const buyerStats = {
            buyerName: '',
            buyerEmail: '',
            totalOrders: 0,
            totalProducts: 0,
            totalSpent: 0,
            averageOrderValue: 0,
            favoriteCategory: '',
            products: {},
            categories: {},
            orderTimeline: []
        };
        const firstOrder = orders[0];
        buyerStats.buyerName = firstOrder.fields.buyerName[0] || 'Acheteur inconnu';
        buyerStats.buyerEmail = firstOrder.fields.buyerEmail[0] || '';
        await Promise.all(orders.map(async (order) => {
            try {
                buyerStats.totalOrders++;
                const payments = await this.getOrderPayments(order.id);
                const orderDate = new Date(order.createdAt || order.fields?.createdAt).toISOString().split('T')[0];
                let orderProductCount = 0;
                let orderAmount = 0;
                payments.forEach(payment => {
                    payment.products.forEach(product => {
                        if (!product.productId)
                            return;
                        if (!buyerStats.products[product.productId]) {
                            buyerStats.products[product.productId] = {
                                name: product.lib || 'Inconnu',
                                category: product.category || 'Inconnue',
                                price: product.price || 'Inconnue',
                                quantity: 0,
                                amount: 0,
                                lastOrderDate: orderDate
                            };
                            buyerStats.totalProducts++;
                        }
                        else {
                            if (new Date(orderDate) > new Date(buyerStats.products[product.productId].lastOrderDate)) {
                                buyerStats.products[product.productId].lastOrderDate = orderDate;
                            }
                        }
                        buyerStats.products[product.productId].quantity += product.quantity || 0;
                        buyerStats.products[product.productId].amount += product.total || 0;
                        orderProductCount++;
                        orderAmount += product.total || 0;
                        const category = product.category || 'Non catégorisé';
                        if (!buyerStats.categories[category]) {
                            buyerStats.categories[category] = {
                                name: product.lib || 'Inconnu',
                                category: product.category || 'Inconnue',
                                price: product.price || 'Inconnue',
                                quantity: 0,
                                amount: 0
                            };
                        }
                        buyerStats.categories[category].quantity += product.quantity || 0;
                        buyerStats.categories[category].amount += product.total || 0;
                    });
                });
                buyerStats.orderTimeline.push({
                    date: orderDate,
                    amount: orderAmount,
                    productCount: orderProductCount
                });
                buyerStats.totalSpent += orderAmount;
            }
            catch (error) {
                console.error(`Erreur commande ${order.id}:`, error.message);
            }
        }));
        buyerStats.averageOrderValue = buyerStats.totalOrders > 0
            ? buyerStats.totalSpent / buyerStats.totalOrders
            : 0;
        if (Object.keys(buyerStats.categories).length > 0) {
            buyerStats.favoriteCategory = Object.entries(buyerStats.categories)
                .sort((a, b) => b[1].amount - a[1].amount)[0][0];
        }
        buyerStats.orderTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return buyerStats;
    }
    async calculateSingleFarmerStats(farmerId, orders) {
        const products = await this.productsService.findAll();
        const farmerStats = {
            farmerName: 'Agriculteur inconnu',
            farmerEmail: '',
            totalSales: 0,
            totalProductsSold: 0,
            totalRevenue: 0,
            averageSaleValue: 0,
            bestSellingProduct: '',
            bestSellingProductName: '',
            products: {},
            buyers: {},
            salesTimeline: []
        };
        try {
            for (const order of orders) {
                const payments = await this.getOrderPayments(order.id);
                const farmerData = payments.find(p => p.farmerId === farmerId);
                if (farmerData) {
                    farmerStats.farmerName = farmerData.name || 'Agriculteur inconnu';
                    farmerStats.farmerEmail = farmerData.email || '';
                    break;
                }
            }
        }
        catch (error) {
            console.error('Erreur initialisation agriculteur:', error);
        }
        await Promise.all(orders.map(async (order) => {
            try {
                const payments = await this.getOrderPayments(order.id);
                const farmerPayment = payments.find(p => p.farmerId === farmerId);
                if (!farmerPayment)
                    return;
                const saleDate = new Date(order.createdAt || order.fields?.createdAt).toISOString().split('T')[0];
                let saleProductCount = 0;
                let saleAmount = 0;
                farmerPayment.products.forEach(product => {
                    if (!product.productId)
                        return;
                    if (!farmerStats.products[product.productId]) {
                        const productName = products.find(p => p.id === product.productId)?.fields.Name || product.productId;
                        farmerStats.products[product.productId] = {
                            productName,
                            quantitySold: 0,
                            revenue: 0,
                            lastSaleDate: saleDate,
                            buyers: {}
                        };
                        farmerStats.totalProductsSold++;
                    }
                    const currentProduct = farmerStats.products[product.productId];
                    currentProduct.quantitySold += product.quantity || 0;
                    currentProduct.revenue += product.total || 0;
                    currentProduct.lastSaleDate = saleDate;
                    if (order.fields.buyerId) {
                        const buyerName = order.fields.buyerName[0] || `Acheteur ${order.fields.buyerId.slice(0, 6)}`;
                        currentProduct.buyers[order.fields.buyerId] = {
                            buyerName,
                            quantity: (currentProduct.buyers[order.fields.buyerId]?.quantity || 0) + (product.quantity || 0)
                        };
                        if (!farmerStats.buyers[order.fields.buyerId]) {
                            farmerStats.buyers[order.fields.buyerId] = {
                                buyerName,
                                quantity: 0,
                                amount: 0
                            };
                        }
                        farmerStats.buyers[order.fields.buyerId].quantity += product.quantity || 0;
                        farmerStats.buyers[order.fields.buyerId].amount += product.total || 0;
                    }
                    saleProductCount++;
                    saleAmount += product.total || 0;
                });
                farmerStats.salesTimeline.push({
                    date: saleDate,
                    amount: saleAmount,
                    productCount: saleProductCount
                });
                farmerStats.totalSales++;
                farmerStats.totalRevenue += saleAmount;
            }
            catch (error) {
                console.error(`Erreur traitement commande ${order.id}:`, error.message);
            }
        }));
        farmerStats.averageSaleValue = farmerStats.totalSales > 0
            ? parseFloat((farmerStats.totalRevenue / farmerStats.totalSales).toFixed(2))
            : 0;
        if (Object.keys(farmerStats.products).length > 0) {
            const [productId, productData] = Object.entries(farmerStats.products)
                .sort((a, b) => b[1].revenue - a[1].revenue)[0];
            farmerStats.bestSellingProduct = productId;
            farmerStats.bestSellingProductName = productData.productName;
        }
        const groupedTimeline = {};
        farmerStats.salesTimeline.forEach(entry => {
            if (!groupedTimeline[entry.date]) {
                groupedTimeline[entry.date] = { amount: 0, productCount: 0 };
            }
            groupedTimeline[entry.date].amount += entry.amount;
            groupedTimeline[entry.date].productCount += entry.productCount;
        });
        farmerStats.salesTimeline = Object.entries(groupedTimeline)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return farmerStats;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        users_service_1.UsersService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map