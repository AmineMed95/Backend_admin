import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from '../roles/role.entity';
export declare class UsersService {
    private userRepo;
    private roleRepo;
    constructor(userRepo: Repository<User>, roleRepo: Repository<Role>);
    findByEmail(email: string): Promise<User | null>;
    createAdmin(dto: any): Promise<User[]>;
}
