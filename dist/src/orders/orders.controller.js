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
const products_service_1 = require("../products/products.service");
const create_order_dto_1 = require("./create-order.dto");
const auth_guard_1 = require("../auth/auth.guard");
const axios_1 = require("axios");
const users_service_1 = require("../users/users.service");
class DateRangeDto {
}
class ProductStatDto {
}
class OrderStatsResponse {
}
let OrdersController = class OrdersController {
    constructor(ordersService, productsService, usersService) {
        this.ordersService = ordersService;
        this.productsService = productsService;
        this.usersService = usersService;
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
    async getGlobalStatistics(dateRange) {
        try {
            const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
            const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;
            startDate?.setHours(0, 0, 0, 0);
            endDate?.setHours(23, 59, 59, 999);
            if (startDate && isNaN(startDate.getTime())) {
                throw new common_1.HttpException('Format de date de début invalide (utilisez YYYY-MM-DD)', common_1.HttpStatus.BAD_REQUEST);
            }
            if (endDate && isNaN(endDate.getTime())) {
                throw new common_1.HttpException('Format de date de fin invalide (utilisez YYYY-MM-DD)', common_1.HttpStatus.BAD_REQUEST);
            }
            if (startDate && endDate && startDate > endDate) {
                throw new common_1.HttpException('La date de début ne peut pas être postérieure à la date de fin', common_1.HttpStatus.BAD_REQUEST);
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (startDate && startDate > today) {
                throw new common_1.HttpException('La date de début ne peut pas être dans le futur', common_1.HttpStatus.BAD_REQUEST);
            }
            const allOrders = await this.ordersService.findAll();
            if (!allOrders.length) {
                return {
                    message: 'Aucune commande trouvée',
                    products: []
                };
            }
            const filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.createdAt || order.fields?.createdAt);
                return ((!startDate || orderDate >= startDate) &&
                    (!endDate || orderDate <= endDate));
            });
            const stats = await this.ordersService.calculateOrderStats(filteredOrders);
            return {
                period: {
                    start: startDate?.toISOString().split('T')[0] || 'Tous',
                    end: endDate?.toISOString().split('T')[0] || 'Tous'
                },
                ...stats
            };
        }
        catch (error) {
            console.error('Erreur détaillée:', error);
            throw error;
        }
    }
    async getFarmerStatistics(dateRange) {
        try {
            const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
            const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;
            startDate?.setHours(0, 0, 0, 0);
            endDate?.setHours(23, 59, 59, 999);
            if (startDate && isNaN(startDate.getTime())) {
                throw new common_1.HttpException('Format de date de début invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            if (endDate && isNaN(endDate.getTime())) {
                throw new common_1.HttpException('Format de date de fin invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            if (startDate && endDate && startDate > endDate) {
                throw new common_1.HttpException('La date de début doit être ultérieure à la date de fin', common_1.HttpStatus.BAD_REQUEST);
            }
            const allOrders = await this.ordersService.findAll();
            const filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.createdAt || order.fields?.createdAt);
                return ((!startDate || orderDate >= startDate) &&
                    (!endDate || orderDate <= endDate));
            });
            const stats = await this.ordersService.calculateFarmerStats(filteredOrders);
            return {
                period: {
                    start: startDate?.toISOString().split('T')[0] || 'Tous',
                    end: endDate?.toISOString().split('T')[0] || 'Tous'
                },
                ...stats
            };
        }
        catch (error) {
            throw error;
        }
    }
    async getBuyerStatistics(dateRange) {
        try {
            const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
            const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;
            startDate?.setHours(0, 0, 0, 0);
            endDate?.setHours(23, 59, 59, 999);
            if (startDate && isNaN(startDate.getTime())) {
                throw new common_1.HttpException('Format de date de début invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            if (endDate && isNaN(endDate.getTime())) {
                throw new common_1.HttpException('Format de date de fin invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            const allOrders = await this.ordersService.findAll();
            const filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.createdAt || order.fields?.date);
                return ((!startDate || orderDate >= startDate) &&
                    (!endDate || orderDate <= endDate));
            });
            const stats = await this.ordersService.calculateBuyerStats(filteredOrders);
            return {
                success: true,
                period: {
                    start: startDate?.toISOString().split('T')[0] || 'Tous',
                    end: endDate?.toISOString().split('T')[0] || 'Tous'
                },
                ...stats
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.response?.message || 'Erreur de calcul des statistiques acheteurs', error.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getBuyerDetailedStats(buyerId, dateRange) {
        try {
            const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
            const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;
            startDate?.setHours(0, 0, 0, 0);
            endDate?.setHours(23, 59, 59, 999);
            if (startDate && isNaN(startDate.getTime())) {
                throw new common_1.HttpException('Format de date de début invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            if (endDate && isNaN(endDate.getTime())) {
                throw new common_1.HttpException('Format de date de fin invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            const allOrders = await this.ordersService.findAll();
            const filteredOrders = allOrders.filter(order => {
                const isBuyerMatch = order.fields.buyerId[0] === buyerId;
                const orderDate = new Date(order.createdAt || order.fields?.createdAt);
                return (isBuyerMatch &&
                    (!startDate || orderDate >= startDate) &&
                    (!endDate || orderDate <= endDate));
            });
            if (filteredOrders.length === 0) {
                return {
                    message: 'Aucune commande trouvée pour cet acheteur sur la période sélectionnée',
                    buyerId,
                    period: {
                        start: startDate?.toISOString().split('T')[0] || 'Tous',
                        end: endDate?.toISOString().split('T')[0] || 'Tous'
                    },
                    stats: null
                };
            }
            const stats = await this.ordersService.calculateSingleBuyerStats(buyerId, filteredOrders);
            return {
                success: true,
                buyerId,
                period: {
                    start: startDate?.toISOString().split('T')[0] || 'Tous',
                    end: endDate?.toISOString().split('T')[0] || 'Tous'
                },
                stats
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.response?.message || 'Erreur de calcul des statistiques acheteur', error.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getFarmerDetailedStats(farmerId, dateRange) {
        try {
            const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
            const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;
            startDate?.setHours(0, 0, 0, 0);
            endDate?.setHours(23, 59, 59, 999);
            if (startDate && isNaN(startDate.getTime())) {
                throw new common_1.HttpException('Format de date de début invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            if (endDate && isNaN(endDate.getTime())) {
                throw new common_1.HttpException('Format de date de fin invalide', common_1.HttpStatus.BAD_REQUEST);
            }
            const allOrders = await this.ordersService.findAll();
            const filteredOrders = (await Promise.all(allOrders.map(async (order) => {
                try {
                    const payments = await this.ordersService.getOrderPayments(order.id);
                    const isFarmerMatch = payments.some(p => p.farmerId === farmerId);
                    const orderDate = new Date(order.createdAt || order.fields?.createdAt);
                    const isWithinRange = (!startDate || orderDate >= startDate) &&
                        (!endDate || orderDate <= endDate);
                    return (isFarmerMatch && isWithinRange) ? order : null;
                }
                catch (error) {
                    console.error(`Erreur filtre commande ${order.id}:`, error);
                    return null;
                }
            }))).filter(order => order !== null);
            if (filteredOrders.length === 0) {
                return {
                    success: true,
                    message: 'Aucune vente trouvée pour cet agriculteur sur la période sélectionnée',
                    farmerId,
                    period: {
                        start: startDate?.toISOString().split('T')[0] || 'Tous',
                        end: endDate?.toISOString().split('T')[0] || 'Tous'
                    },
                    stats: null
                };
            }
            const stats = await this.ordersService.calculateSingleFarmerStats(farmerId, filteredOrders);
            return {
                success: true,
                farmerId,
                period: {
                    start: startDate?.toISOString().split('T')[0] || 'Tous',
                    end: endDate?.toISOString().split('T')[0] || 'Tous'
                },
                stats
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.response?.message || 'Erreur de calcul des statistiques agriculteur', error.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id) {
        return this.ordersService.findOne(id);
    }
    async create(createOrderDto, req) {
        const buyerId = req.user.id;
        const role = req.user.profile;
        if (role !== 'ACHETEUR') {
            throw new Error('Vous n\'êtes pas autorisé(e) à passer une commande.');
        }
        const orderData = {
            ...createOrderDto,
            buyerId: [buyerId],
        };
        return this.ordersService.create(orderData);
    }
    async update(id, data, req) {
        if (req.user.profile !== 'ACHETEUR') {
            throw new Error('Vous n\'êtes pas autorisé(e) à modifier la commande.');
        }
        return this.ordersService.update(id, data);
    }
    async updatePayment(id, data) {
        console.log('Données reçues dans le contrôleur :', data);
        return this.ordersService.updateFarmerPayment(id, data);
    }
    async delete(id) {
        return this.ordersService.delete(id);
    }
    async updateStatus(orderId, status, req) {
        try {
            const userId = req.user.id;
            const existingOrder = await this.ordersService.findOne(orderId);
            const farmerId = existingOrder.fields.farmerId[0];
            const allowedProfiles = ['ADMIN', 'SUPERADMIN'];
            if (!allowedProfiles.includes(req.user.profile)) {
                throw new Error('Vous n\'êtes pas autorisé(e) à modifier le statut de cette commande.');
            }
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
    async getDashboardStats() {
        try {
            const [products, orders] = await Promise.all([
                this.productsService.findAll(),
                this.ordersService.findAll(),
            ]);
            if (!products.length) {
                return { message: 'No products available' };
            }
            const productStats = {};
            let globalTotalAmount = 0;
            await Promise.all(orders.map(async (order) => {
                try {
                    const payments = await this.ordersService.getOrderPayments(order.id);
                    payments.forEach(payment => {
                        payment.products.forEach(product => {
                            if (!product.productId)
                                return;
                            if (!productStats[product.productId]) {
                                productStats[product.productId] = {
                                    totalQuantity: 0,
                                    totalRevenue: 0,
                                    productName: product.lib || 'Nom inconnu',
                                    category: product.category || 'Non catégorisé'
                                };
                            }
                            productStats[product.productId].totalQuantity += product.quantity || 0;
                            productStats[product.productId].totalRevenue += product.total || 0;
                            globalTotalAmount += product.total || 0;
                        });
                    });
                }
                catch (error) {
                    console.error(`Erreur commande ${order.id}:`, error.message);
                }
            }));
            const productsArray = Object.keys(productStats).map(productId => ({
                productId,
                totalQuantity: productStats[productId].totalQuantity,
                totalRevenue: productStats[productId].totalRevenue,
                productName: productStats[productId].productName,
                category: productStats[productId].category
            }));
            const topByQuantity = [...productsArray]
                .sort((a, b) => b.totalQuantity - a.totalQuantity)
                .slice(0, 5);
            const topByRevenue = [...productsArray]
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, 5);
            const totalProductsSold = productsArray.reduce((sum, p) => sum + p.totalQuantity, 0);
            const avgProductValue = globalTotalAmount / (totalProductsSold || 1);
            const categoryStats = products.reduce((acc, product) => {
                const category = product.fields?.category || 'Non catégorisé';
                const price = product.fields?.price || 0;
                if (!acc[category]) {
                    acc[category] = { total: 0, count: 0 };
                }
                acc[category].total += price;
                acc[category].count += 1;
                return acc;
            }, {});
            const avgPriceByCategory = Object.entries(categoryStats).map(([category, stats]) => ({
                category,
                averagePrice: stats.total / stats.count,
                productCount: stats.count,
            }));
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + (order.fields.totalPrice || 0), 0);
            return {
                summary: {
                    totalProductsSold,
                    globalTotalAmount,
                    avgProductValue
                },
                topByQuantity,
                topByRevenue,
                avgPriceByCategory,
                orderStats: {
                    totalOrders,
                    totalRevenue,
                    avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to load dashboard stats', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getProductsStats() {
        const orders = await this.ordersService.findAll();
        const products = await this.productsService.findAll();
        const productMap = new Map(products.map(p => [p.id, p]));
        const stats = {};
        for (const order of orders) {
            for (const item of order.products) {
                const product = productMap.get(item.productId);
                if (!product)
                    continue;
                const productId = product.id;
                if (!stats[productId]) {
                    stats[productId] = {
                        name: product.name,
                        quantity: 0,
                        total: 0,
                        category: product.category,
                    };
                }
                stats[productId].quantity += item.quantity;
                stats[productId].total += item.quantity * product.price;
            }
        }
        return Object.values(stats);
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
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getGlobalStatistics", null);
__decorate([
    (0, common_1.Get)('stats/farmers'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getFarmerStatistics", null);
__decorate([
    (0, common_1.Get)('stats/buyers'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getBuyerStatistics", null);
__decorate([
    (0, common_1.Get)('stats/buyers/:buyerId'),
    __param(0, (0, common_1.Param)('buyerId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getBuyerDetailedStats", null);
__decorate([
    (0, common_1.Get)('stats/farmers/:farmerId'),
    __param(0, (0, common_1.Param)('farmerId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getFarmerDetailedStats", null);
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
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Put)('updateOrder/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updatePayment", null);
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
__decorate([
    (0, common_1.Post)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('products-stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getProductsStats", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        products_service_1.ProductsService,
        users_service_1.UsersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map