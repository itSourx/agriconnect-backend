import { ProfilesService } from '../profiles/profiles.service';
export declare class UsersService {
    private readonly profilesService;
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    constructor(profilesService: ProfilesService);
    private getHeaders;
    private getUrl;
    private hashPassword;
    findAll(page?: number, perPage?: number): Promise<any[]>;
    findUsersByProfile(profileId: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    findOneByEmail(email: string): Promise<any | null>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    findAllByProfile(profile: string): Promise<any[]>;
}
