import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { ChangePasswordDto } from './change-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<any[]>;
    findAllByProfile(profile: string): Promise<any[]>;
    findOneByEmail(email: string): Promise<any>;
    findOne(id: string): Promise<any>;
    create(createUserDto: CreateUserDto): Promise<any>;
    register(createUserDto: CreateUserDto): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
    changePassword(id: string, changePasswordDto: ChangePasswordDto, req: any): Promise<any>;
    resetPassword(body: {
        email: string;
    }): Promise<any>;
    validateResetPassword(body: {
        email: string;
        temporaryPassword: string;
        newPassword: string;
    }): Promise<any>;
}
