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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const create_order_dto_1 = require("./create-order.dto");
const auth_guard_1 = require("../auth/auth.guard");
const axios_1 = require("axios");
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    getUrl() {
        return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Orders`;
    }
    getHeaders() {
        return {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
        };
    }
    async findAll() {
        return this.ordersService.findAll();
    }
    async findOne(id) {
        return this.ordersService.findOne(id);
    }
    async create(createOrderDto, req) {
        const buyerId = req.user.id;
        const orderData = {
            ...createOrderDto,
            buyerId: [buyerId],
        };
        return this.ordersService.create(orderData);
    }
    async update(id, data) {
        return this.ordersService.update(id, data);
    }
    async delete(id) {
        return this.ordersService.delete(id);
    }
    async updateStatus(orderId, status, req) {
        try {
            return this.ordersService.updateStatus(orderId, status);
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du statut de la commande :', error.message);
            throw new Error(error.message);
        }
    }
    async getOrdersByFarmer(farmerId, req) {
        try {
            const farmerOrders = await this.ordersService.getOrdersByFarmer(farmerId);
            return {
                data: farmerOrders
            };
        }
        catch (error) {
            console.error('Erreur lors de la récupération des commandes pour l\'agriculteur :', error.message);
            throw new Error('Impossible de récupérer les commandes pour cet agriculteur.');
        }
    }
    async getOrderPayments(orderId) {
        try {
            const payments = await this.ordersService.getOrderPayments(orderId);
            return payments;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des détails de paiement :', error.message);
            throw error;
        }
    }
    async generateAndStoreInvoice(orderId) {
        try {
            const pdfBuffer = await this.ordersService.generateInvoice(orderId);
            const base64Content = pdfBuffer.toString('base64');
            const fileName = `invoice_${orderId}.pdf`;
            const fileSizeInBytes = Buffer.from(base64Content, 'base64').length;
            const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
            if (fileSizeInMB > 5) {
                throw new Error('Le fichier PDF est trop volumineux (limite : 5 Mo).');
            }
            const response = await axios_1.default.patch(`${this.getUrl()}/${orderId}`, {
                fields: {
                    invoice: [
                        {
                            url: `data:application/pdf;base64,${base64Content}`,
                            filename: fileName,
                        },
                    ],
                },
            }, { headers: this.getHeaders() });
            console.log('Facture enregistrée avec succès :', response.data);
            return {
                message: 'Facture générée et enregistrée avec succès.',
                data: {
                    orderId,
                    invoiceUrl: response.data.fields.invoice[0].url,
                },
            };
        }
        catch (error) {
            console.error('Erreur lors de la génération et du stockage de la facture :', error.response?.data || error.message);
            throw Error;
        }
    }
    async previewInvoice(orderId, res) {
        try {
            const pdfBuffer = await this.ordersService.generateInvoice(orderId);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(pdfBuffer);
        }
        catch (error) {
            console.error('Erreur lors de la prévisualisation de la facture :', error.message);
            res.status(500).send('Erreur lors de la génération de la facture.');
        }
    }
    async sendInvoice(orderId) {
        try {
            const existingOrder = await this.ordersService.findOne(orderId);
            if (!existingOrder) {
                throw new Error('Commande introuvable.');
            }
            const orderDetails = existingOrder.fields;
            const buyerEmail = orderDetails.buyerEmail;
            if (!buyerEmail) {
                throw new Error('Aucun e-mail trouvé pour cette commande.');
            }
            await this.ordersService.sendInvoiceByEmail(orderId, buyerEmail);
            return {
                message: 'Facture envoyée avec succès.',
                data: {
                    orderId,
                    email: buyerEmail,
                },
            };
        }
        catch (error) {
            console.error('Erreur lors de l\'envoi de la facture :', error.message);
            throw Error;
        }
    }
    async getFarmerClients(farmerId) {
        try {
            const clients = await this.ordersService.getFarmerClients(farmerId);
            return clients;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des clients de l\'agriculteur :', error.message);
            throw error;
        }
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe()),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "delete", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('byfarmer/:farmerId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('farmerId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrdersByFarmer", null);
__decorate([
    (0, common_1.Get)('details/:id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrderPayments", null);
__decorate([
    (0, common_1.Post)('invoice/:id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "generateAndStoreInvoice", null);
__decorate([
    (0, common_1.Get)('preview-invoice/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "previewInvoice", null);
__decorate([
    (0, common_1.Post)('send-invoice/:id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "sendInvoice", null);
__decorate([
    (0, common_1.Get)('getFarmerClients/:farmerId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('farmerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getFarmerClients", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map