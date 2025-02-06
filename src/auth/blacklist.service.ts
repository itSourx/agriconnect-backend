import { Injectable } from '@nestjs/common';

@Injectable()
export class BlacklistService {
  private blacklist: string[] = []; // Stockage en mémoire (pour les tests)

  // Ajouter un token à la liste noire
  async add(token: string): Promise<void> {
    this.blacklist.push(token);
  }

  // Vérifier si un token est dans la liste noire
  async isBlacklisted(token: string): Promise<boolean> {
    return this.blacklist.includes(token);
  }
}