import { Response } from 'express';
import { OrdersService } from './orders.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './create-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    private readonly productsService;
    constructor(ordersService: OrdersService, productsService: ProductsService);
    private getUrl;
    private getHeaders;
    findAll(): Promise<any[]>;
    getGlobalStatistics(dateRange?: {
        startDate?: string;
        endDate?: string;
    }): Promise<{
        message: string;
        products: never[];
    } | {
        totalOrders: number;
        totalProducts: number;
        globalTotalRevenue: number;
        products: {
            percentageOfTotal: number;
            percentageOfOrders: number;
            orderCount: number;
            productName: string;
            category: string;
            mesure: string;
            totalQuantity: number;
            totalRevenue: number;
            productId: string;
        }[];
        period: {
            start: string;
            end: string;
        };
        message?: undefined;
    }>;
    getFarmerStatistics(dateRange: {
        startDate?: string;
        endDate?: string;
    }): Promise<{
        totalFarmers: number;
        globalTotalRevenue: number;
        farmers: {
            percentageOfTotalRevenue: number;
            farmerName: string;
            farmerEmail: string;
            totalOrders: number;
            totalProducts: number;
            totalRevenue: number;
            products: Record<string, {
                name: string;
                category: string;
                price: number;
                quantity: number;
                revenue: number;
            }>;
            farmerId: string;
        }[];
        period: {
            start: string;
            end: string;
        };
    }>;
    getBuyerStatistics(dateRange: {
        startDate?: string;
        endDate?: string;
    }): Promise<{
        totalBuyers: number;
        globalTotalRevenue: number;
        buyers: {
            percentageOfTotalSpent: number;
            categoryStats: {
                percentage: number;
                quantity: number;
                amount: number;
                category: string;
            }[];
            buyerName: string;
            buyerEmail: string;
            totalOrders: number;
            totalProducts: number;
            totalSpent: number;
            favoriteCategory: string;
            products: Record<string, {
                name: string;
                category: string;
                price: number;
                quantity: number;
                amount: number;
            }>;
            categories: Record<string, {
                quantity: number;
                amount: number;
            }>;
            buyerId: string;
        }[];
        success: boolean;
        period: {
            start: string;
            end: string;
        };
    }>;
    findOne(id: string): Promise<any>;
    create(createOrderDto: CreateOrderDto, req: any): Promise<any>;
    update(id: string, data: any, req: any): Promise<any>;
    updatePayment(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    updateStatus(orderId: string, status: string, req: any): Promise<any>;
    getOrdersByFarmer(farmerId: string, req: any): Promise<{
        data: any;
    }>;
    getOrderPayments(orderId: string): Promise<any>;
    generateAndStoreInvoice(orderId: string): Promise<{
        message: string;
        data: {
            orderId: string;
            invoiceUrl: any;
        };
    }>;
    previewInvoice(orderId: string, res: Response): Promise<void>;
    sendInvoice(orderId: string): Promise<{
        message: string;
        data: {
            orderId: string;
            email: any;
        };
    }>;
    getFarmerClients(farmerId: string): Promise<any>;
    getDashboardStats(): Promise<{
        message: string;
        summary?: undefined;
        topByQuantity?: undefined;
        topByRevenue?: undefined;
        avgPriceByCategory?: undefined;
        orderStats?: undefined;
    } | {
        summary: {
            totalProductsSold: number;
            globalTotalAmount: number;
            avgProductValue: number;
        };
        topByQuantity: {
            productId: string;
            totalQuantity: number;
            totalRevenue: number;
            productName: string;
            category: string;
        }[];
        topByRevenue: {
            productId: string;
            totalQuantity: number;
            totalRevenue: number;
            productName: string;
            category: string;
        }[];
        avgPriceByCategory: {
            category: string;
            averagePrice: number;
            productCount: number;
        }[];
        orderStats: {
            totalOrders: number;
            totalRevenue: any;
            avgOrderValue: number;
        };
        message?: undefined;
    }>;
    getProductsStats(): Promise<unknown[]>;
}
