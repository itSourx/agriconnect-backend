import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { BlacklistService } from './blacklist.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly blacklistService;
    constructor(usersService: UsersService, jwtService: JwtService, blacklistService: BlacklistService);
    validateUser(email: string, password: string): Promise<any>;
    login(user: any): Promise<any>;
}
