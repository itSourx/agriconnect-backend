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
exports.CreateOrderDto = exports.OrderProductDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class OrderProductDto {
}
exports.OrderProductDto = OrderProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'recQW2EwO7NhBBUkX',
        description: 'ID du produit',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrderProductDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '25',
        description: 'La quantité du produit',
    }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], OrderProductDto.prototype, "quantity", void 0);
class CreateOrderDto {
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '[{ "id": "rec4aAR2UPDfhYcRG", "quantity": 2 }, { "id": "recCzV2gqqSK721IE", "quantity": 3 }]',
        description: 'Formater les détails du produits (id et quantité) en tableau',
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OrderProductDto),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "products", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'recQW2EwO7NhBBUkX',
        description: 'ID du paiement',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "transaction_id", void 0);
//# sourceMappingURL=create-order.dto.js.map