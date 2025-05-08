import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BlacklistService } from './blacklist.service';
export declare class AuthGuard implements CanActivate {
    private readonly jwtService;
    private readonly blacklistService;
    constructor(jwtService: JwtService, blacklistService: BlacklistService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
}
