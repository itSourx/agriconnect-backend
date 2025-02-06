export declare class BlacklistService {
    private blacklist;
    add(token: string): Promise<void>;
    isBlacklisted(token: string): Promise<boolean>;
}
