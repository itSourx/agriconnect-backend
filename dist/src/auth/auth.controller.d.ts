import { AuthService } from './auth.service';
import { BlacklistService } from './blacklist.service';
import { LoginDto } from './login.dto';
export declare class AuthController {
    private readonly authService;
    private readonly blacklistService;
    constructor(authService: AuthService, blacklistService: BlacklistService);
    login(body: LoginDto): Promise<any>;
    logout(req: any): Promise<any>;
}
