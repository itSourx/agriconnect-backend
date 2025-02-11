import { ProfilesService } from '../profiles/profiles.service';
import { BlacklistService } from '../auth/blacklist.service';
export declare class UsersService {
    private readonly blacklistService;
    private readonly profilesService;
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    constructor(blacklistService: BlacklistService, profilesService: ProfilesService);
    private getHeaders;
    private getUrl;
    private verifyPassword;
    private hashPassword;
    changePassword(userId: string, oldPassword: string, newPassword: string, token: string): Promise<any>;
    private logout;
    findAll(page?: number, perPage?: number): Promise<any[]>;
    findUsersByProfile(profileId: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    findOneByEmail(email: string): Promise<any | null>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    findAllByProfile(profile: string): Promise<any[]>;
    private generateRandomPassword;
    resetPassword(email: string): Promise<any>;
    private sendPasswordResetEmail;
    validateResetPassword(email: string, temporaryPassword: string, newPassword: string): Promise<any>;
}
