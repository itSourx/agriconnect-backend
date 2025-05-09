import { ProfilesService } from '../profiles/profiles.service';
import { BlacklistService } from '../auth/blacklist.service';
import { GCSService } from '../google_cloud/gcs.service';
export declare class UsersService {
    private readonly blacklistService;
    private readonly profilesService;
    private readonly gcsService;
    private readonly apiKey;
    private readonly baseId;
    private readonly tableName;
    private base;
    constructor(blacklistService: BlacklistService, profilesService: ProfilesService, gcsService: GCSService);
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
    create(data: any, files?: Express.Multer.File[]): Promise<any>;
    update(id: string, data: any, files?: Express.Multer.File[]): Promise<any>;
    delete(id: string): Promise<any>;
    findAllByProfile(profile: string): Promise<any[]>;
    private generateRandomPassword;
    resetPassword(email: string): Promise<any>;
    private sendPasswordResetEmail;
    validateResetPassword(email: string, temporaryPassword: string, newPassword: string, token: string): Promise<any>;
    getProfileById(id: string): Promise<any>;
    checkUserStatus(email: string): Promise<void>;
    unlockUser(email: string): Promise<{
        message: string;
    }>;
    blockUser(email: string): Promise<void>;
}
