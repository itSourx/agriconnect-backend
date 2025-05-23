export declare class ProfilesService {
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    private getHeaders;
    private getUrl;
    findAll(): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    findOneByType(type: string): Promise<any | null>;
    findAllByType(type: string): Promise<any[]>;
}
