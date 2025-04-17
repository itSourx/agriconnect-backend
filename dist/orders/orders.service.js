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
            };
            let totalPrice = 0;
            for (const product of data.products) {
                const productRecord = await this.productsService.findOne(product.id);
                totalPrice += productRecord.fields.price * product.quantity;
            }
            formattedData.totalPrice = totalPrice;
            console.log('Données formatées pour Airtable :', formattedData);
            const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: formattedData }] }, { headers: this.getHeaders() });
            console.log('Commande créée avec succès :', response.data);
            return response.data.records[0];
        }
        catch (error) {
            console.error('Erreur lors de la création de la commande :', error.response?.data || error.message);
            throw new Error('Impossible de créer la commande.');
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
            };
            if (!allowedStatusTransitions[currentStatus]?.includes(status)) {
                throw Error(`Impossible de passer la commande de "${currentStatus}" à "${status}".`);
            }
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
                quantity,
                price,
                total: totalAmount,
            });
        }
        return Object.values(farmerPayments);
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        users_service_1.UsersService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map