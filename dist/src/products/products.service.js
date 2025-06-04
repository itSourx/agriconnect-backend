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
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const dotenv = require("dotenv");
const users_service_1 = require("../users/users.service");
const gcs_service_1 = require("../google_cloud/gcs.service");
const fs_1 = require("fs");
dotenv.config();
let ProductsService = ProductsService_1 = class ProductsService {
    constructor(usersService, gcsService) {
        this.usersService = usersService;
        this.gcsService = gcsService;
        this.logger = new common_1.Logger(ProductsService_1.name);
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
    async findAll() {
        try {
            console.log('Récupération de tous les produits...');
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
        const response = await axios_1.default.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
        if (!response) {
            throw new Error('Produit non trouvé.');
        }
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
    async create(data, files) {
        if (typeof data.price === 'string') {
            data.price = parseFloat(data.price);
        }
        if (typeof data.quantity === 'string') {
            data.quantity = parseInt(data.quantity, 10);
        }
        if (data.email) {
            const user = await this.usersService.findOneByEmail(data.email);
            if (!user) {
                throw new Error(`Cet utilisateur "${data.email}" n'existe pas.`);
            }
            const profile = user.fields.profileType[0];
            if (profile !== 'AGRICULTEUR') {
                throw new Error('Vous n\'êtes pas autorisé(e) à créer un produit.');
            }
            console.error('profile de l\'agriculteur récupéré :', profile);
            const compteOwo = user.fields.compteOwo;
            if (!compteOwo) {
                throw new Error('Vous devez obligatoirement définir votre compte OwoPay avant de créer de produits.');
            }
            console.error('compteOwo de l\'agriculteur récupéré :', compteOwo);
            data.user = [user.id];
            delete data.email;
        }
        if (files && files.length > 0) {
            const uploadedImages = await Promise.all(files.map(async (file) => {
                try {
                    const publicUrl = await this.gcsService.uploadImage(file.path);
                    (0, fs_1.unlinkSync)(file.path);
                    return publicUrl;
                }
                catch (error) {
                    console.error('Erreur lors de l\'upload de l\'image :', error.message);
                    throw new Error('Impossible d\'uploader l\'image.');
                }
            }));
            data.Photo = uploadedImages.map(url => ({ url }));
        }
        else if (data.Photo) {
            if (typeof data.Photo === 'string') {
                data.Photo = [{ url: data.Photo }];
            }
            else if (Array.isArray(data.Photo)) {
                data.Photo = data.Photo.map(url => ({ url }));
            }
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
            throw error;
        }
    }
    async update(id, data = {}, files, galleryFiles) {
        try {
            console.log('Données reçues dans le service :', data);
            if (data.price && typeof data.price === 'string') {
                data.price = parseFloat(data.price);
            }
            if (data.quantity && typeof data.quantity === 'string') {
                data.quantity = parseInt(data.quantity);
            }
            const existingProduct = await this.findOne(id);
            const compteOwo = existingProduct.fields.compteOwo;
            if (!compteOwo) {
                throw new Error('Vous n\'avez toujours pas encore défini votre compte OwoPay.');
            }
            console.error('compteOwo de l\'agriculteur récupéré :', compteOwo);
            if (files && files.length > 0) {
                const uploadedImages = await Promise.all(files.map(async (file) => {
                    try {
                        const publicUrl = await this.gcsService.uploadImage(file.path);
                        (0, fs_1.unlinkSync)(file.path);
                        return publicUrl;
                    }
                    catch (error) {
                        console.error('Erreur lors de l\'upload de l\'image :', error.message);
                        throw new Error('Impossible d\'uploader l\'image.');
                    }
                }));
                data.Photo = uploadedImages.map(url => ({ url }));
            }
            if (galleryFiles && galleryFiles.length > 0) {
                const uploadedGalleryImages = await Promise.all(galleryFiles.map(async (file) => {
                    try {
                        const publicUrl = await this.gcsService.uploadImage(file.path);
                        (0, fs_1.unlinkSync)(file.path);
                        return publicUrl;
                    }
                    catch (error) {
                        console.error('Erreur lors de l\'upload de l\'image :', error.message);
                        throw new Error('Impossible d\'uploader l\'image.');
                    }
                }));
                data.Gallery = uploadedGalleryImages.map(url => ({ url }));
            }
            const normalizedData = { ...data };
            console.log('Données envoyées à Airtable :', { fields: normalizedData });
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: normalizedData }, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du produit :', error.message);
            throw error;
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
    async findByFarmer(farmerId) {
        try {
            const allProducts = await this.findAll();
            const farmerProducts = allProducts.filter(product => {
                const farmerIds = product.fields.farmerId;
                return Array.isArray(farmerIds) && farmerIds.includes(farmerId);
            });
            return farmerProducts;
        }
        catch (error) {
            console.error('Erreur lors de la recherche des produits par agriculteur :', error.message);
            throw error;
        }
    }
    async findEquivalentProducts(productName, quantityNeeded) {
        try {
            const normalizedProductName = productName.toLowerCase().replace(/s$/, '');
            const response = await axios_1.default.get(`${this.getUrl()}`, {
                params: {
                    filterByFormula: `LOWER(SUBSTITUTE({name}, " ", "")) = "${normalizedProductName}"`,
                },
                headers: this.getHeaders(),
            });
            const products = response.data.records.map((record) => record.fields);
            return products.filter((product) => product.quantity >= quantityNeeded);
        }
        catch (error) {
            console.error('Erreur lors de la recherche des produits équivalents :', error.message);
            throw error;
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        gcs_service_1.GCSService])
], ProductsService);
//# sourceMappingURL=products.service.js.map