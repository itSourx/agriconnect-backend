export declare class OrdersService {
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    private getHeaders;
    private getUrl;
    findAll(page?: number, perPage?: number): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}
