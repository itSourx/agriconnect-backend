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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProductsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const products_service_1 = require("./products.service");
const create_product_dto_1 = require("./create-product.dto");
const auth_guard_1 = require("../auth/auth.guard");
const swagger_1 = require("@nestjs/swagger");
const platform_express_2 = require("@nestjs/platform-express");
const multer_1 = require("multer");
let ProductsController = ProductsController_1 = class ProductsController {
    constructor(productsService) {
        this.productsService = productsService;
        this.logger = new common_1.Logger(ProductsController_1.name);
    }
    async findAll() {
        return this.productsService.findAll();
    }
    async findByFarmer(id) {
        return this.productsService.findByFarmer(id);
    }
    async findAllByCategory(category) {
        return this.productsService.findAllByCategory(category);
    }
    async delete(id) {
        return this.productsService.delete(id);
    }
    async findOne(id) {
        return this.productsService.findOne(id);
    }
    async create(files, data) {
        try {
            const product = await this.productsService.create(data, files);
            return product;
        }
        catch (error) {
            console.error('Erreur lors de la création du produit :', error.message);
            throw error;
        }
    }
    async update(id, data, files) {
        try {
            console.log('Données reçues dans le contrôleur :', data);
            console.log('Fichiers uploadés dans le contrôleur :', files);
            const photoFiles = files.Photo || [];
            const galleryFiles = files.Gallery || [];
            const updatedProduct = await this.productsService.update(id, data, photoFiles, galleryFiles);
            return updatedProduct;
        }
        catch (error) {
            console.error('Erreur dans le contrôleur :', error.message);
            throw error;
        }
    }
    async search(query) {
        return this.productsService.search(query);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('findByFarmer/:id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findByFarmer", null);
__decorate([
    (0, common_1.Get)('by-category/:category'),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAllByCategory", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('add'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_2.FilesInterceptor)('Photo', 5, {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, callback) => {
                callback(null, `${Date.now()}-${file.originalname}`);
            },
        }),
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'Photo', maxCount: 5 },
        { name: 'Gallery', maxCount: 10 },
    ], {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, callback) => {
                callback(null, `${Date.now()}-${file.originalname}`);
            },
        }),
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('search/:query'),
    __param(0, (0, common_1.Param)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "search", null);
exports.ProductsController = ProductsController = ProductsController_1 = __decorate([
    (0, swagger_1.ApiTags)('products'),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map