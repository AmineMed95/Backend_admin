import { UsersService } from '../../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    login(email: string, password: string): Promise<{
        access_token: string;
    }>;
}
