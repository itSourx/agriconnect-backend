"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const common_2 = require("@nestjs/common");
const blacklist_service_1 = require("./blacklist.service");
let AuthGuard = class AuthGuard {
    constructor(jwtService, blacklistService) {
        this.jwtService = jwtService;
        this.blacklistService = blacklistService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        console.log('Requête reçue:', request.url);
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            console.error('Token absent ou mal formaté.');
            throw new common_2.UnauthorizedException('Aucun token fourni.');
        }
        if (await this.blacklistService.isBlacklisted(token)) {
            return false;
        }
        try {
            console.log('Tentative de validation du token...');
            const payload = await this.jwtService.verifyAsync(token);
            console.log('Payload décodé:', payload);
            request['user'] = payload;
            return true;
        }
        catch {
            throw new common_2.UnauthorizedException('Token invalide ou expiré.');
        }
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'bearer' ? token : undefined;
        console.log('Headers:', request.headers);
        console.log('Token extrait:', token);
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(blacklist_service_1.BlacklistService)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        blacklist_service_1.BlacklistService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map