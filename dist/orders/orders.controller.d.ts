import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    private getUrl;
    private getHeaders;
    findAll(): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(createOrderDto: CreateOrderDto, req: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
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
}
