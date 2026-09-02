// Role tags shaped `${appTag}::${roleTitle}`, matching the seeded appRole
// rows (see packages/db/prisma/seed.ts) and the umsa-family RBAC convention.
export const ADMIN_ONLY = ["ubs::administrator"];
export const STAFF = ["ubs::administrator", "ubs::facilitator"];
export const ANY_STAFF = ["ubs::administrator", "ubs::facilitator", "ubs::decorator"];
