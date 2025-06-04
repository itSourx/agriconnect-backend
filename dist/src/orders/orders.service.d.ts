import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { Buffer } from 'buffer';
export declare class OrdersService {
    private readonly productsService;
    private readonly usersService;
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    constructor(productsService: ProductsService, usersService: UsersService);
    private getHeaders;
    private getUrl;
    batchGetOrderPayments(orderIds: string[]): Promise<any[]>;
    findAll(): Promise<any[]>;
    findOne(id: string): Promise<any>;
    getOrderById(orderId: string): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    updateFarmerPayment(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    updateStatus(id: string, status: string): Promise<any>;
    calculateFarmerPayments(products: string[], quantities: number[]): Promise<any>;
    getOrdersByFarmer(farmerId: string): Promise<any>;
    getOrderPayments(orderId: string): Promise<any>;
    private loadPdfFonts;
    private loadImageAsBase64;
    generateInvoice(orderId: string): Promise<Buffer>;
    sendInvoiceByEmail(orderId: string, buyerEmail: string): Promise<void>;
    getFarmerClients(farmerId: string): Promise<any>;
    calculateOrderStats(orders: any[]): Promise<{
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
    }>;
    calculateFarmerStats(orders: any[]): Promise<{
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
    }>;
    calculateBuyerStats(orders: any[]): Promise<{
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
    }>;
}
