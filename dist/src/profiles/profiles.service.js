"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const dotenv = require("dotenv");
dotenv.config();
let ProfilesService = class ProfilesService {
    constructor() {
        this.apiKey = process.env.AIRTABLE_API_KEY;
        this.baseId = process.env.AIRTABLE_BASE_ID;
        this.tableName = process.env.AIRTABLE_PROFILES_TABLE;
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
    async findAll() {
        const response = await axios_1.default.get(this.getUrl(), { headers: this.getHeaders() });
        return response.data.records;
    }
    async findOne(id) {
        const response = await axios_1.default.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
        return response.data;
    }
    async create(data) {
        const response = await axios_1.default.post(this.getUrl(), { records: [{ fields: data }] }, { headers: this.getHeaders() });
        return response.data;
    }
    async update(id, data) {
        const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: data }, { headers: this.getHeaders() });
        return response.data;
    }
    async delete(id) {
        const response = await axios_1.default.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
        return response.data;
    }
    async findOneByType(type) {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `({type}="${type}")`,
                },
            });
            if (response.data.records.length > 0) {
                const profile = response.data.records[0];
                if (Array.isArray(profile.fields.type)) {
                    profile.fields.type = profile.fields.type[0];
                }
                return profile;
            }
            return null;
        }
        catch (error) {
            console.error('Erreur lors de la recherche du profil :', error);
            return null;
        }
    }
    async findAllByType(type) {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `({type}="${type}")`,
                },
            });
            const profiles = response.data.records.map((profile) => {
                if (Array.isArray(profile.fields.type)) {
                    profile.fields.type = profile.fields.type[0];
                }
                return profile;
            });
            return profiles;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des profils par type :', error);
            throw new Error('Impossible de récupérer les profils.');
        }
    }
};
exports.ProfilesService = ProfilesService;
exports.ProfilesService = ProfilesService = __decorate([
    (0, common_1.Injectable)()
], ProfilesService);
//# sourceMappingURL=profiles.service.js.map