import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
export declare class OrdersService {
    private readonly productsService;
    private readonly usersService;
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    constructor(productsService: ProductsService, usersService: UsersService);
    private getHeaders;
    private getUrl;
    findAll(page?: number, perPage?: number): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    updateStatus(id: string, status: string): Promise<any>;
    calculateFarmerPayments(products: string[], quantities: number[]): Promise<any>;
    getOrdersByFarmer(farmerId: string): Promise<any>;
    getOrderPayments(orderId: string): Promise<any>;
}
