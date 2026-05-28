const { PrismaClient } = require("./generated/prisma");
const prisma = new PrismaClient();

async function main() {
  console.log("Instantiating PrismaClient...");
  try {
    const tokens = await prisma.authToken.findMany({ take: 5 });
    console.log("Successfully connected and fetched tokens:", tokens);
  } catch (error) {
    console.error("Error with @prisma/client:", error.message);
  }
}

main().catch(console.error);
