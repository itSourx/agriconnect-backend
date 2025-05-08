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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const blacklist_service_1 = require("./blacklist.service");
const swagger_1 = require("@nestjs/swagger");
const login_dto_1 = require("./login.dto");
let AuthController = class AuthController {
    constructor(authService, blacklistService) {
        this.authService = authService;
        this.blacklistService = blacklistService;
    }
    async login(body) {
        const { email, password } = body;
        if (!email || !password) {
            throw new common_2.UnauthorizedException('Email et mot de passe sont requis.');
        }
        const user = await this.authService.validateUser(email, password);
        if (user.resetPasswordUsed) {
            return {
                user,
                message: 'Vous devez changer votre mot de passe et vous reconnecter.',
                requiresPasswordChange: true,
            };
        }
        return this.authService.login({ email, password });
    }
    async logout(req) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            throw new Error('Aucun token trouvé.');
        }
        await this.blacklistService.add(token);
        return { message: 'Déconnexion réussie.' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Connexion d\'un utilisateur' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Connexion réussie.',
        schema: {
            example: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                    id: 'recUSER123',
                    email: 'user@example.com',
                    name: 'John Doe',
                    profileType: 'Acheteur',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Connexion réussie.' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Identifiants incorrects.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        blacklist_service_1.BlacklistService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map