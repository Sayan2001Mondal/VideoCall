const { PrismaClient } = require("./generated/prisma");
const prisma = new PrismaClient();

const tokenArg = process.argv[2];

if (!tokenArg) {
  console.error("Error: Please provide the token string. Usage: node insert_token.js <token_string>");
  process.exit(1);
}

async function main() {
  console.log("Connecting to database and inserting token...");
  try {
    const created = await prisma.authToken.upsert({
      where: { token: tokenArg },
      update: {}, // If it already exists, do nothing
      create: { token: tokenArg }
    });
    console.log("Successfully registered token in AuthToken table:", created);
  } catch (error) {
    console.error("Database operation failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
