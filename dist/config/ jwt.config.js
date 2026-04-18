"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = void 0;
exports.jwtConfig = {
    secret: process.env.JWT_SECRET || 'secretKey',
    signOptions: {
        expiresIn: '1d',
    },
};
//# sourceMappingURL=%20jwt.config.js.map