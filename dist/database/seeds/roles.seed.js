"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRoles = seedRoles;
const role_entity_1 = require("../../roles/role.entity");
async function seedRoles(dataSource) {
    const roleRepo = dataSource.getRepository(role_entity_1.Role);
    const roles = ['super_admin', 'admin', 'agent'];
    for (const name of roles) {
        const exists = await roleRepo.findOne({ where: { name } });
        if (!exists) {
            await roleRepo.save(roleRepo.create({ name }));
        }
    }
}
//# sourceMappingURL=roles.seed.js.map