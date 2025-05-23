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
const blacklist_service_1 = require("../auth/blacklist.service");
const Airtable = require("airtable");
const nodemailer = require("nodemailer");
const gcs_service_1 = require("../google_cloud/gcs.service");
const fs_1 = require("fs");
dotenv.config();
let UsersService = class UsersService {
    constructor(blacklistService, profilesService, gcsService) {
        this.blacklistService = blacklistService;
        this.profilesService = profilesService;
        this.gcsService = gcsService;
        this.apiKey = process.env.AIRTABLE_API_KEY;
        this.baseId = process.env.AIRTABLE_BASE_ID;
        this.tableName = process.env.AIRTABLE_USERS_TABLE;
    }
    initAirtable() {
        if (!this.base) {
            if (!this.apiKey || !this.baseId) {
                throw new Error('Airtable configuration is missing');
            }
            const airtable = new Airtable({ apiKey: this.apiKey });
            this.base = airtable.base(this.baseId);
        }
        return this.base;
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
    async verifyPassword(storedHash, plainTextPassword) {
        return bcrypt.compare(plainTextPassword, storedHash);
    }
    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
    async changePassword(userId, oldPassword, newPassword, token) {
        const user = await this.findOne(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Utilisateur introuvable.');
        }
        const passwordHash = user.fields.password;
        const isPasswordValid = await this.verifyPassword(passwordHash, oldPassword);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Ancien mot de passe incorrect.');
        }
        if (newPassword.length < 8) {
            throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
        }
        const hashedNewPassword = await this.hashPassword(newPassword);
        try {
            const response = await axios_1.default.patch(`${this.getUrl()}/${userId}`, { fields: { password: hashedNewPassword } }, { headers: this.getHeaders() });
            await this.logout(token);
            return { message: 'Mot de passe mis à jour avec succès! Vous avez été déconnecté.' };
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du mot de passe :', error);
            throw new Error('Impossible de mettre à jour le mot de passe.');
        }
    }
    async logout(token) {
        if (!token) {
            return;
        }
        await this.blacklistService.add(token);
    }
    async findAll() {
        try {
            console.log('Récupération de tous les enregistrements...');
            let allRecords = [];
            let offset = undefined;
            do {
                const response = await axios_1.default.get(this.getUrl(), {
                    headers: this.getHeaders(),
                    params: {
                        pageSize: 100,
                        offset: offset,
                    },
                });
                allRecords = allRecords.concat(response.data.records);
                offset = response.data.offset;
            } while (offset);
            console.log(`Nombre total d'enregistrements récupérés : ${allRecords.length}`);
            return allRecords;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des enregistrements :', error.message);
            throw error;
        }
    }
    async findUsersByProfile(profileId) {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `({profile}="${profileId}")`,
                },
            });
            return response.data.records;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs par profil :', error);
            throw new Error('Impossible de récupérer les utilisateurs.');
        }
    }
    async getSuperAdmin() {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `{profile} = 'SUPERADMIN'`,
                    maxRecords: 1,
                },
            });
            const users = response.data.records;
            if (!users || users.length === 0) {
                throw new Error('Aucun utilisateur avec le profil SUPERADMIN trouvé.');
            }
            return users[0];
        }
        catch (error) {
            console.error('Erreur lors de la recherche du superadmin :', error.message);
            throw new Error('Impossible de trouver le superadmin.');
        }
    }
    async checkIfSuperAdminExists() {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `{profile} = 'SUPERADMIN'`,
                    maxRecords: 1,
                },
            });
            const users = response.data.records;
            return users && users.length > 0;
        }
        catch (error) {
            console.error('Erreur lors de la vérification du SUPERADMIN :', error.message);
            throw new Error('Impossible de vérifier l\'existence du SUPERADMIN.');
        }
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
            console.log('Réponse brute d’Airtable :', response.data);
            if (response.data.records.length > 0) {
                const user = response.data.records[0];
                if (Array.isArray(user.fields.email)) {
                    user.fields.type = user.fields.email[0];
                }
                return user;
            }
            return null;
        }
        catch (error) {
            console.error('Erreur lors de la recherche d’utilisateur par email :', error);
            throw new Error('Impossible de récupérer les données utilisateur.');
        }
    }
    async create(data, files) {
        const existingUser = await this.findOneByEmail(data.email);
        if (existingUser) {
            throw new common_1.ConflictException('Un utilisateur avec cet email existe déjà.');
        }
        if (data.profileType === 'SUPERADMIN') {
            const superAdminExists = await this.checkIfSuperAdminExists();
            if (superAdminExists) {
                throw new Error('Un utilisateur avec le profile SUPERADMIN existe déjà.');
            }
        }
        const reference = Math.floor(1000000 + Math.random() * 9000000).toString();
        data.reference = reference;
        if (files && files.length > 0) {
            const uploadedImages = await Promise.all(files.map(async (file) => {
                try {
                    const publicUrl = await this.gcsService.uploadImage(file.path);
                    (0, fs_1.unlinkSync)(file.path);
                    return publicUrl;
                }
                catch (error) {
                    console.error('Erreur lors de l\'upload de l\'image :', error.message);
                    throw new Error('Impossible d\'uploader l\'image.');
                }
            }));
            data.Photo = uploadedImages.map(url => ({ url }));
        }
        else if (data.Photo) {
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
    async update(id, data, files) {
        try {
            if (data.ifu && typeof data.ifu === 'string') {
                data.ifu = parseInt(data.ifu);
            }
            if (data.compteOwo && typeof data.compteOwo === 'string') {
                data.compteOwo = parseInt(data.compteOwo);
            }
            if (data.profileType) {
                const profile = await this.profilesService.findOneByType(data.profileType);
                if (!profile) {
                    throw new Error(`Le type de profil "${data.profileType}" n'existe pas.`);
                }
                data.profile = [profile.id];
                delete data.profileType;
            }
            if (files && files.length > 0) {
                const uploadedImages = await Promise.all(files.map(async (file) => {
                    try {
                        const publicUrl = await this.gcsService.uploadImage(file.path);
                        (0, fs_1.unlinkSync)(file.path);
                        return publicUrl;
                    }
                    catch (error) {
                        console.error('Erreur lors de l\'upload de l\'image :', error.message);
                        throw new Error('Impossible d\'uploader l\'image.');
                    }
                }));
                data.Photo = uploadedImages.map(url => ({ url }));
            }
            else if (data.Photo) {
                if (typeof data.Photo === 'string') {
                    data.Photo = [{ url: data.Photo }];
                }
                else if (Array.isArray(data.Photo)) {
                    data.Photo = data.Photo.map(url => ({ url }));
                }
            }
            const response = await axios_1.default.patch(`${this.getUrl()}/${id}`, { fields: data }, { headers: this.getHeaders() });
            console.error('Données de mise à jour de l’utilisateur :', data);
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
    async findAllByProfile(profile) {
        try {
            const response = await axios_1.default.get(this.getUrl(), {
                headers: this.getHeaders(),
                params: {
                    filterByFormula: `({profile}="${profile}")`,
                },
            });
            const users = response.data.records.map((user) => {
                if (Array.isArray(user.fields.profile)) {
                    user.fields.profile = user.fields.profile[0];
                }
                return user;
            });
            return users;
        }
        catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs par profil :', error);
            throw new Error('Impossible de récupérer les utilisateurs.');
        }
    }
    generateRandomPassword(length = 9) {
        const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        }
        return password;
    }
    async resetPassword(email, token) {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('Aucun utilisateur trouvé avec cet email.');
        }
        const temporaryPassword = this.generateRandomPassword(9);
        const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, 10);
        try {
            const response = await axios_1.default.patch(`${this.getUrl()}/${user.id}`, { fields: { resetPassword: hashedTemporaryPassword } }, { headers: this.getHeaders() });
            await this.sendPasswordResetEmail(email, temporaryPassword);
            return { message: 'Un mot de passe temporaire a été envoyé à votre adresse email.' };
        }
        catch (error) {
            console.error('Erreur lors de la réinitialisation du mot de passe :', error);
            throw new Error('Impossible de réinitialiser le mot de passe.');
        }
    }
    async sendPasswordResetEmail(email, temporaryPassword) {
        const transporter = nodemailer.createTransport({
            host: 'mail.sourx.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            text: `Votre nouveau mot de passe temporaire est : ${temporaryPassword}. Veuillez le changer dès que possible.`,
        };
        await transporter.sendMail(mailOptions);
    }
    async validateResetPassword(email, temporaryPassword, newPassword, token) {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('Aucun utilisateur trouvé avec cet email.');
        }
        const storedTemporaryPassword = user.fields.resetPassword;
        if (!storedTemporaryPassword) {
            throw new common_1.UnauthorizedException('Aucun mot de passe temporaire enregistré.');
        }
        const isPasswordValid = await bcrypt.compare(temporaryPassword, storedTemporaryPassword);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Mot de passe temporaire incorrect.');
        }
        if (newPassword.length < 8) {
            throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        try {
            const response = await axios_1.default.patch(`${this.getUrl()}/${user.id}`, { fields: { password: hashedNewPassword, resetPassword: '' } }, { headers: this.getHeaders() });
            await this.logout(token);
            return { message: 'Mot de passe mis à jour avec succès! Vous avez été déconnecté.' };
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du mot de passe :', error);
            throw error;
        }
    }
    async getProfileById(id) {
        try {
            const response = await axios_1.default.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.error('Erreur lors de la récupération du profil :', error);
            return null;
        }
    }
    async checkUserStatus(email) {
        console.log(`Vérification du statut de l'utilisateur : ${email}`);
        const user = await this.findOneByEmail(email);
        if (user.fields.Status === 'Deactivated') {
            throw new Error('Votre compte a été bloqué. Veuillez contacter l\'administrateur ');
        }
        console.log(`Statut validé avec succès pour l'utilisateur' : ${email}`);
    }
    async unlockUser(email) {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new Error('Aucun utilisateur trouvé avec cet email.');
        }
        if (user.fields.Status === 'Activated') {
            throw new Error('Le compte de cet utilisateur est déjà activé.');
        }
        try {
            await this.update(user.id, { Status: 'Activated', tentatives_echec: 0 });
            return { message: 'Le compte a été activé avec succès.' };
        }
        catch (error) {
            console.error('Erreur lors de l\'activation du compte :', error);
            throw new Error('Une erreur est survenue lors de l\'activation du compte.');
        }
    }
    async blockUser(email) {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new Error('Aucun utilisateur trouvé avec cet email.');
        }
        if (user.fields.Status === 'Deactivated') {
            throw new Error('Le compte de cet utilisateur est déjà bloqué.');
        }
        try {
            await this.update(user.id, { Status: 'Deactivated' });
        }
        catch (error) {
            console.error('Erreur lors du blocage du compte :', error);
            throw new Error('Une erreur est survenue lors du blocage du compte.');
        }
    }
    async incrementFailedAttempts(email) {
        const user = await this.findOneByEmail(email);
        const newAttempts = (user.fields.tentatives_echec || 0) + 1;
        if (newAttempts >= 3) {
            await this.update(user.id, { Status: 'Deactivated', tentatives_echec: newAttempts });
            throw new Error('Votre compte a été bloqué après 3 tentatives infructueuses.');
        }
        await this.update(user.id, { tentatives_echec: newAttempts });
    }
    async resetFailedAttempts(email) {
        try {
            const user = await this.findOneByEmail(email);
            await this.update(user.id, { tentatives_echec: 0 });
            const updatedUser = await this.findOneByEmail(email);
        }
        catch (error) {
            throw error;
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [blacklist_service_1.BlacklistService,
        profiles_service_1.ProfilesService,
        gcs_service_1.GCSService])
], UsersService);
//# sourceMappingURL=users.service.js.map