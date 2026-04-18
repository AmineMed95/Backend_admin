"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
function validateEnv(config) {
    const requiredEnv = [
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
        'JWT_SECRET',
    ];
    for (const key of requiredEnv) {
        if (!config[key]) {
            throw new Error(`Missing environment variable: ${key}`);
        }
    }
    return config;
}
//# sourceMappingURL=env.validation.js.map