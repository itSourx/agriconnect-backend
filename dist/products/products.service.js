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
            if (user.fields.profile.trim() !== 'AGRICULTEUR') {
                throw new common_1.UnauthorizedException('Seul un agriculteur peut ajouter des produits.');
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
            throw new Error('Impossible de créer ce produit.');
        }
    }
    async update(id, data) {
        if (data.Photo) {
            if (typeof data.Photo === 'string') {
                data.Photo = [{ url: data.Photo }];
            }
            else if (Array.isArray(data.Photo)) {
                data.Photo = data.Photo.map(url => ({ url }));
            }
        }
        if (data.Gallery) {
            if (typeof data.Gallery === 'string') {
                data.Gallery = [{ url: data.Gallery }];
            }
            else if (Array.isArray(data.Gallery)) {
                data.Gallery = data.Photo.map(url => ({ url }));
            }
        }
        try {
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: data }, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du produit :', error);
            throw new Error('Impossible de mettre à jour le produit.');
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
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], ProductsService);
//# sourceMappingURL=products.service.js.map