import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { ChangePasswordDto } from './change-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<any[]>;
    getSuperAdmin(): Promise<any>;
    findAllByProfile(profile: string): Promise<any[]>;
    findOneByEmail(email: string): Promise<any>;
    findOne(id: string): Promise<any>;
    create(files: Express.Multer.File[], createUserDto: CreateUserDto): Promise<any>;
    register(files: Express.Multer.File[], createUserDto: CreateUserDto): Promise<any>;
    update(id: string, files: Express.Multer.File[], data: any): Promise<any>;
    delete(id: string): Promise<any>;
    changePassword(id: string, changePasswordDto: ChangePasswordDto, req: any): Promise<any>;
    resetPassword(body: {
        email: string;
    }, req: any): Promise<any>;
    validateResetPassword(body: {
        email: string;
        temporaryPassword: string;
        newPassword: string;
    }, req: any): Promise<any>;
    unlockUser(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
    blockUser(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
}
