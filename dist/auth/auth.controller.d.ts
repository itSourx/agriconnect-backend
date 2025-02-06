import { AuthService } from './auth.service';
import { BlacklistService } from './blacklist.service';
export declare class AuthController {
    private readonly authService;
    private readonly blacklistService;
    constructor(authService: AuthService, blacklistService: BlacklistService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
    }>;
    logout(req: any): Promise<any>;
}
