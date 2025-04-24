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
const fs = require("fs");
const path = require("path");
const pdfMake = require("pdfmake/build/pdfmake");
const pdfFonts = require("pdfmake/build/vfs_fonts");
const nodemailer = require("nodemailer");
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
                quantity,
                price,
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
                        status: fields.status,
                        createdDate: formattedDate,
                        statusDate: formattedStatusDate,
                        totalAmount: farmerPayment.totalAmount,
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
    async generateInvoice(orderId) {
        this.loadPdfFonts();
        try {
            const existingOrder = await this.findOne(orderId);
            if (!existingOrder) {
                throw new Error('Commande introuvable.');
            }
            const orderDetails = existingOrder.fields;
            const buyerName = orderDetails.buyerName || 'Client inconnu';
            const totalPrice = orderDetails.totalPrice || 0;
            const totalProducts = orderDetails.Nbr || 0;
            const products = orderDetails.products || [];
            const quantities = orderDetails.Qty || [];
            console.log('Produits bruts :', products);
            console.log('Quantités brutes :', quantities);
            const normalizedProducts = Array.isArray(products) ? products : [products];
            let normalizedQuantities = Array.isArray(quantities)
                ? quantities.map(Number)
                : [Number(quantities)];
            if (typeof quantities === 'string') {
                normalizedQuantities = quantities.split(',').map(qty => {
                    const parsedQty = Number(qty.trim());
                    if (isNaN(parsedQty)) {
                        console.error(`Quantité invalide détectée : "${qty}"`);
                        return 0;
                    }
                    return parsedQty;
                });
            }
            console.log('Produits normalisés :', normalizedProducts);
            console.log('Quantités normalisées :', normalizedQuantities);
            if (normalizedProducts.length !== normalizedQuantities.length) {
                throw new Error('Les données de la commande sont incohérentes.');
            }
            const rawDate = orderDetails.createdAt;
            const formattedDate = rawDate ? (0, date_fns_1.format)(new Date(rawDate), 'dd/MM/yyyy HH:mm') : 'Date inconnue';
            const content = [];
            content.push({ text: 'FACTURE', style: 'header' });
            content.push({ text: `Commande #${orderId}`, style: 'subheader' });
            content.push({ text: `Acheteur : ${buyerName}`, margin: [0, 0, 0, 5] });
            content.push({ text: `Products : ${totalProducts}`, margin: [0, 0, 0, 5] });
            content.push({ text: `total Price : ${totalPrice} FCFA`, margin: [0, 0, 0, 5] });
            content.push({ text: `Date : ${formattedDate}`, margin: [0, 0, 0, 15] });
            content.push({ text: 'Détails des produits', style: 'sectionHeader' });
            const bodyRows = [];
            for (let i = 0; i < normalizedProducts.length; i++) {
                const productId = normalizedProducts[i];
                const product = await this.productsService.findOne(productId);
                const productName = product?.fields.Name || 'Produit inconnu';
                const price = product?.fields.price || 0;
                const quantity = normalizedQuantities[i];
                console.log(`Produit ID: ${productId}, Nom: ${productName}, Prix: ${price}, Quantité: ${quantity}`);
                if (!product) {
                    console.warn(`Produit avec l'ID ${productId} introuvable.`);
                }
                const total = price * quantity;
                if (isNaN(total)) {
                    console.error(`Le calcul du total a échoué pour le produit ${productName}. Prix: ${price}, Quantité: ${quantity}`);
                    throw new Error(`Données invalides pour le produit ${productName}. Prix: ${price}, Quantité: ${quantity}`);
                }
                bodyRows.push([productName, quantity, `${price} FCFA`, `${total} FCFA`]);
            }
            content.push({
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'],
                    body: [['Produit', 'Quantité', 'Prix unitaire', 'Total'], ...bodyRows],
                },
                margin: [0, 10, 0, 20],
            });
            content.push({ text: 'Merci pour votre achat !', style: 'footer', margin: [0, 20, 0, 0] });
            const docDefinition = {
                content,
                styles: {
                    header: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
                    subheader: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
                    sectionHeader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5] },
                    footer: { fontSize: 12, alignment: 'center' },
                },
            };
            return new Promise((resolve, reject) => {
                pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
                    if (buffer) {
                        const tempDir = path.join(__dirname, '../temp');
                        const filePath = path.join(tempDir, `invoice_${orderId}.pdf`);
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                            console.log(`Dossier temp créé : ${tempDir}`);
                        }
                        fs.writeFileSync(filePath, buffer);
                        console.log(`Fichier PDF sauvegardé localement : ${filePath}`);
                        resolve(buffer);
                    }
                    else {
                        reject(new Error('Erreur lors de la génération du PDF.'));
                    }
                });
            });
        }
        catch (error) {
            console.error('Erreur lors de la génération de la facture :', error.message);
            throw error;
        }
    }
    async sendInvoiceByEmail(orderId, buyerEmail) {
        try {
            const pdfBuffer = await this.generateInvoice(orderId);
            const fileName = `invoice_${orderId}.pdf`;
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
                subject: `Votre facture - Commande #${orderId}`,
                text: `Bonjour,\n\nVeuillez trouver ci-joint votre facture pour la commande #${orderId}.`,
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