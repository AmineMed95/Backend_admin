import { Role } from '../roles/role.entity';
export declare class User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone: string;
    organization_name: string;
    status: boolean;
    role: Role;
    role_id: number;
    created_at: Date;
    updated_at: Date;
}
