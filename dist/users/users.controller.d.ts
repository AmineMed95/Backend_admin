import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    createAdmin(dto: any): Promise<import("./user.entity").User[]>;
}
