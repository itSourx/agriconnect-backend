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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const blacklist_service_1 = require("./blacklist.service");
const common_2 = require("@nestjs/common");
let AuthService = class AuthService {
    constructor(usersService, jwtService, blacklistService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.blacklistService = blacklistService;
    }
    async validateUser(email, password) {
        console.log('Tentative de validation pour l’email :', email);
        const user = await this.usersService.findOneByEmail(email);
        console.log('Données brutes de l’utilisateur :', user);
        if (!user) {
            throw new common_2.UnauthorizedException('Identifiants incorrects.');
        }
        const hasResetPassword = user.fields.resetPassword;
        let isPasswordValid = false;
        if (hasResetPassword) {
            isPasswordValid = await bcrypt.compare(password, user.fields.resetPassword);
        }
        else {
            isPasswordValid = await bcrypt.compare(password, user.fields.password);
        }
        if (!isPasswordValid) {
            throw new common_2.UnauthorizedException('Identifiants incorrects.');
        }
        const sanitizedUser = {
            id: user.id,
            email: user.fields.email || null,
            firstName: user.fields.FirstName || null,
            lastName: user.fields.LastName || null,
            address: user.fields.address || null,
            photo: user.fields.Photo?.[0]?.url || null,
            profileType: user.fields.profileType?.[0] || null,
            products: user.fields.ProductsName || [],
            resetPasswordUsed: !!hasResetPassword,
        };
        console.log('Données nettoyées de l’utilisateur :', sanitizedUser);
        return sanitizedUser;
    }
    async login(user) {
        console.log('Tentative de connexion avec :', user.email);
        try {
            const userProfile = await this.validateUser(user.email, user.password);
            console.log('Utilisateur validé :', userProfile);
            if (!userProfile) {
                throw new common_2.UnauthorizedException('Identifiants incorrects.');
            }
            const payload = {
                sub: userProfile.id,
                email: userProfile.email,
                profile: userProfile.profileType,
            };
            const accessToken = this.jwtService.sign(payload);
            return {
                access_token: accessToken,
                user: {
                    id: userProfile.id,
                    email: userProfile.email,
                    firstName: userProfile.FirstName,
                    lastName: userProfile.LastName,
                    photo: userProfile.Photo,
                    profileType: userProfile.profileType,
                    products: userProfile.products,
                    passwordReset: userProfile.isPassReseted,
                },
            };
        }
        catch (error) {
            console.error('Erreur lors de la connexion :', error);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        blacklist_service_1.BlacklistService])
], AuthService);
//# sourceMappingURL=auth.service.js.map