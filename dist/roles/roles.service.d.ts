import { Repository } from 'typeorm';
import { Role } from './role.entity';
export declare class RolesService {
    private roleRepo;
    constructor(roleRepo: Repository<Role>);
    findAll(): Promise<Role[]>;
}
