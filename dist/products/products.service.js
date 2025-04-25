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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const dotenv = require("dotenv");
const users_service_1 = require("../users/users.service");
dotenv.config();
let ProductsService = class ProductsService {
    constructor(usersService) {
        this.usersService = usersService;
        this.apiKey = process.env.AIRTABLE_API_KEY;
        this.baseId = process.env.AIRTABLE_BASE_ID;
        this.tableName = process.env.AIRTABLE_PRODUCTS_TABLE;
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
    async findAll(page = 1, perPage = 20) {
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
    async search(query) {
        try {
            console.log('Requête de recherche :', query);
            const encodedQuery = encodeURIComponent(query.toLowerCase());
            const formula = `OR(
        FIND(LOWER("${encodedQuery}"), LOWER({name})),
        FIND(LOWER("${encodedQuery}"), LOWER({category}))
      )`;
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: formula,
                },
            });
            console.log('Réponse d’Airtable :', response.data.records);
            return response.data.records;
        }
        catch (error) {
            console.error('Erreur lors de la recherche de produits :', error);
            return [];
        }
    }
    async create(data) {
        if (data.email) {
            const user = await this.usersService.findOneByEmail(data.email);
            if (!user) {
                throw new Error(`Cet utilisateur "${data.email}" n'existe pas.`);
            }
            if (data.Photo) {
                if (typeof data.Photo === 'string') {
                    data.Photo = [{ url: data.Photo }];
                }
                else if (Array.isArray(data.Photo)) {
                    data.Photo = data.Photo.map(url => ({ url }));
                }
            }
            data.user = [user.id];
            delete data.email;
        }
        try {
            const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: data }] }, { headers: this.getHeaders() });
            const createdRecord = response.data.records[0];
            const generatedId = createdRecord.id;
            return {
                id: generatedId,
                fields: createdRecord.fields,
            };
        }
        catch (error) {
            console.error('Erreur lors de la création du produit :', error);
            throw Error;
        }
    }
    async createWithFileUpload(data, files) {
        if (data.email) {
            const user = await this.usersService.findOneByEmail(data.email);
            if (!user)
                throw new Error(`Cet utilisateur "${data.email}" n'existe pas.`);
            data.user = [user.id];
            delete data.email;
        }
        if (files && files.length > 0) {
            const uploadPromises = files.map(file => {
                return this.uploadFileToAirtable(file);
            });
            data.Photo = await Promise.all(uploadPromises);
        }
        else if (data.Photo) {
            data.Photo = typeof data.Photo === 'string'
                ? [{ url: data.Photo }]
                : data.Photo.map((url) => ({ url }));
        }
        try {
            const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: data }] }, { headers: this.getHeaders() });
            const createdRecord = response.data.records[0];
            return {
                id: createdRecord.id,
                fields: createdRecord.fields,
            };
        }
        catch (error) {
            console.error('Erreur création produit:', error);
            throw error;
        }
    }
    async uploadFileToAirtable(file) {
        const formData = new FormData();
        formData.append('file', new Blob([file.buffer]), file.originalname);
        try {
            const response = await axios_1.default.post('https://api.airtable.com/v0/appby4zylKcK8soNg/Products/attachments', formData, {
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'multipart/form-data',
                }
            });
            return { url: response.data.url };
        }
        catch (error) {
            console.error('Erreur upload fichier:', error);
            throw new Error('Échec de l\'upload du fichier');
        }
    }
    async update(id, data, files) {
        if (files?.photos?.length) {
            const uploadPromises = files.photos.map(file => this.uploadFileToAirtable(file));
            data.Photo = await Promise.all(uploadPromises);
        }
        else if (data.Photo) {
            data.Photo = typeof data.Photo === 'string'
                ? [{ url: data.Photo }]
                : data.Photo.map((url) => ({ url }));
        }
        if (files?.gallery?.length) {
            const uploadPromises = files.gallery.map(file => this.uploadFileToAirtable(file));
            data.Gallery = await Promise.all(uploadPromises);
        }
        else if (data.Gallery) {
            data.Gallery = typeof data.Gallery === 'string'
                ? [{ url: data.Gallery }]
                : data.Gallery.map((url) => ({ url }));
        }
        try {
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: data }, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur mise à jour produit:', error.response?.data || error.message);
            throw new Error('Échec de la mise à jour du produit');
        }
    }
    async delete(id) {
        const response = await axios_1.default.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
        return response.data;
    }
    async findAllByCategory(category) {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `({category}="${category}")`,
                },
            });
            const products = response.data.records.map((product) => {
                if (Array.isArray(product.fields.category)) {
                    product.fields.category = product.fields.category[0];
                }
                return product;
            });
            return products;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des produits par catégorie :', error);
            throw new Error('Impossible de récupérer les produits.');
        }
    }
    async updateStock(productId, quantity) {
        try {
            const product = await this.findOne(productId);
            if (!product) {
                throw new Error('Produit introuvable.');
            }
            const currentStock = Number(product.fields.quantity || 0);
            if (currentStock < quantity) {
                throw Error(`Le produit avec l'ID ${productId} n'a pas suffisamment de stock.`);
            }
            const newStock = currentStock - quantity;
            const response = await axios_1.default.patch(`${this.getUrl()}/${productId}`, { fields: { quantity: newStock } }, { headers: this.getHeaders() });
            console.log(`Stock mis à jour pour le produit ${productId} :`, response.data);
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du stock :', error.response?.data || error.message);
            throw error;
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], ProductsService);
//# sourceMappingURL=products.service.js.map