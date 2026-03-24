const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe('SELECT 1');
  console.log('DB_OK', result);
}

main()
  .catch((error) => {
    console.error('DB_ERR', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
