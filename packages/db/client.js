"use strict";

const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

if (!globalForPrisma.__mateonPrisma) {
  globalForPrisma.__mateonPrisma = new PrismaClient();
}

module.exports = {
  prisma: globalForPrisma.__mateonPrisma
};
