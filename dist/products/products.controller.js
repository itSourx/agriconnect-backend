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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("./products.service");
const create_product_dto_1 = require("./create-product.dto");
const auth_guard_1 = require("../auth/auth.guard");
const swagger_1 = require("@nestjs/swagger");
let ProductsController = class ProductsController {
    constructor(productsService) {
        this.productsService = productsService;
    }
    async findAll() {
        return this.productsService.findAll();
    }
    async findAllByCategory(category) {
        return this.productsService.findAllByCategory(category);
    }
    async search(query) {
        return this.productsService.search(query);
    }
    async findOne(id) {
        return this.productsService.findOne(id);
    }
    async create(CreateProductDto, req) {
        console.log('Utilisateur connecté :', req.user);
        console.log('Type de profile :', typeof req.user.profile);
        console.log('Valeur brute de profile :', JSON.stringify(req.user.profile));
        if (!req.user || !req.user.profile) {
            throw new common_1.UnauthorizedException('Informations utilisateur manquantes.');
        }
        if (req.user.profile.trim() !== 'AGRICULTEUR') {
            console.error(`Profile incorrect : ${req.user.profile}`);
            throw new common_1.UnauthorizedException('Seul un agriculteur peut ajouter des produits.');
        }
        return this.productsService.create(CreateProductDto);
    }
    async update(id, data) {
        return this.productsService.update(id, data);
    }
    async delete(id) {
        return this.productsService.delete(id);
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
    (0, common_1.Get)('by-category/:category'),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAllByCategory", null);
__decorate([
    (0, common_1.Get)('search/:query'),
    __param(0, (0, common_1.Param)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('add/'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe()),
    (0, swagger_1.ApiOperation)({ summary: 'Création d\'un produit' }),
    (0, swagger_1.ApiBody)({ type: create_product_dto_1.CreateProductDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Création du produit réussie.',
        schema: {
            example: {
                "id": "rec4GnZPae1E7FLo6",
                "fields": {
                    "Name": "Tomates",
                    "description": "Naturel sans angrais chimiques",
                    "price": 25,
                    "quantity": 100,
                    "user": [
                        "recx5GykDnqXoWY5s"
                    ],
                    "category": "Fruits",
                    "id": "rec4GnZPae1E7FLo6",
                    "CreatedDate": "2025-02-15T06:29:40.000Z",
                    "profile": [
                        "recqZJD9Q1qEyW3AT"
                    ],
                    "userLastName": [
                        "KPADONOU"
                    ],
                    "userFirstName": [
                        "Patrique"
                    ],
                    "farmerId": [
                        "recx5GykDnqXoWY5s"
                    ]
                }
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Création du produit réussie.' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Aucun token fourni.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Requête mal envoyée, il manque un paramètre dont la valeur n\'a pas été fournie.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "delete", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map