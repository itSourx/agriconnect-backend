import { UsersService } from '../users/users.service';
export declare class ProductsService {
    private readonly usersService;
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    constructor(usersService: UsersService);
    private getHeaders;
    private getUrl;
    findAll(page?: number, perPage?: number): Promise<any[]>;
    findOne(id: string): Promise<any>;
    search(query: string): Promise<any[]>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    findAllByCategory(category: string): Promise<any[]>;
}
