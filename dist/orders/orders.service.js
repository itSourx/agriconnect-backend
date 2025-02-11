"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const dotenv = require("dotenv");
dotenv.config();
let OrdersService = class OrdersService {
    constructor() {
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
        const response = await axios_1.default.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
        return response.data;
    }
    async create(data) {
        try {
            const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: data }] }, { headers: this.getHeaders() });
            return response.data.records[0];
        }
        catch (error) {
            console.error('Erreur lors de la création de la commande :', error);
            throw new Error('Impossible de créer la commande.');
        }
    }
    async update(id, data) {
        try {
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: data }, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour de la commande :', error);
            throw new Error('Impossible de mettre à jour la commande.');
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
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)()
], OrdersService);
//# sourceMappingURL=orders.service.js.map