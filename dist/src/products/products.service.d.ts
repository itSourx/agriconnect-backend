import { UsersService } from '../users/users.service';
import { GCSService } from './gcs.service';
export declare class ProductsService {
    private readonly usersService;
    private readonly gcsService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    constructor(usersService: UsersService, gcsService: GCSService);
    private getHeaders;
    private getUrl;
    findAll(page?: number, perPage?: number): Promise<any[]>;
    findOne(id: string): Promise<any>;
    search(query: string): Promise<any[]>;
    create(data: any, files?: Express.Multer.File[]): Promise<any>;
    update(id: string, data?: any, files?: Express.Multer.File[], galleryFiles?: Express.Multer.File[]): Promise<any>;
    delete(id: string): Promise<any>;
    findAllByCategory(category: string): Promise<any[]>;
    updateStock(productId: string, quantity: number): Promise<any>;
    findByFarmer(farmerId: string): Promise<any[]>;
}
