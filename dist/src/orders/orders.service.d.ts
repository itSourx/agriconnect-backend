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
    findAll(): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
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
}
