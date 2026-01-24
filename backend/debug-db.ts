import "dotenv/config";
import prisma from "./src/config/db.ts";

async function main() {
  const userId = 1;
  console.log(`Checking LinkedAccounts for userId: ${userId}`);
  const accounts = await prisma.linkedAccount.findMany({
    where: { userId },
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
