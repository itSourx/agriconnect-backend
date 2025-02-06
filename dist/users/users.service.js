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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const profiles_service_1 = require("../profiles/profiles.service");
dotenv.config();
let UsersService = class UsersService {
    constructor(profilesService) {
        this.profilesService = profilesService;
        this.apiKey = process.env.AIRTABLE_API_KEY;
        this.baseId = process.env.AIRTABLE_BASE_ID;
        this.tableName = process.env.AIRTABLE_USERS_TABLE;
    }
    getHeaders() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
    }
    getUrl() {
        return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
    }
    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
    async findAll(page = 1, perPage = 10) {
        const offset = (page - 1) * perPage;
        const response = await axios_1.default.get(this.getUrl(), {
            headers: this.getHeaders(),
            params: {
                pageSize: perPage,
                offset: offset > 0 ? offset.toString() : undefined,
            },
        });
        return response.data.records;
    }
    async findOne(id) {
        const response = await axios_1.default.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
        return response.data;
    }
    async findOneByEmail(email) {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `({email}="${email}")`,
                },
            });
            if (response.data.records.length > 0) {
                return response.data.records[0];
            }
            return null;
        }
        catch (error) {
            console.error('Erreur lors de la recherche d’utilisateur par email :', error);
            return null;
        }
    }
    async create(data) {
        const existingUser = await this.findOneByEmail(data.email);
        if (existingUser) {
            throw new common_1.ConflictException('Un utilisateur avec cet email existe déjà.');
        }
        if (data.Photo) {
            if (typeof data.Photo === 'string') {
                data.Photo = [{ url: data.Photo }];
            }
            else if (Array.isArray(data.Photo)) {
                data.Photo = data.Photo.map(url => ({ url }));
            }
        }
        if (data.profileType) {
            const profile = await this.profilesService.findOneByType(data.profileType);
            if (!profile) {
                throw new Error(`Le type de profil "${data.profileType}" n'existe pas.`);
            }
            data.profile = [profile.id];
            delete data.profileType;
        }
        if (data.password) {
            data.password = await this.hashPassword(data.password);
        }
        try {
            const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: data }] }, { headers: this.getHeaders() });
            const createdRecord = response.data.records[0];
            const generatedId = createdRecord.id;
            return {
                id: generatedId,
                fields: createdRecord.fields,
            };
        }
        catch (error) {
            console.error('Erreur lors de la création de l’utilisateur :', error);
            throw new Error('Impossible de créer l’utilisateur.');
        }
    }
    async update(id, data) {
        if (data.Photo) {
            if (typeof data.Photo === 'string') {
                data.Photo = [{ url: data.Photo }];
            }
            else if (Array.isArray(data.Photo)) {
                data.Photo = data.Photo.map(url => ({ url }));
            }
        }
        try {
            if (data.profileType) {
                const profile = await this.profilesService.findOneByType(data.profileType);
                if (!profile) {
                    throw new Error(`Le type de profil "${data.profileType}" n'existe pas.`);
                }
                data.profile = [profile.id];
                delete data.profileType;
            }
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: data }, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour de l’utilisateur :', error);
            throw new Error('Impossible de mettre à jour l’utilisateur.');
        }
    }
    async delete(id) {
        const response = await axios_1.default.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
        return response.data;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [profiles_service_1.ProfilesService])
], UsersService);
//# sourceMappingURL=users.service.js.map