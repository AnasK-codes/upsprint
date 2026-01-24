
import "dotenv/config";
import prisma from "./src/config/db.ts";

async function main() {
  console.log("Listing all users:");
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
