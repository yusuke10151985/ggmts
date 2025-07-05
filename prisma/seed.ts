const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { key: 'free_user_daily_limit' },
    update: { value: '50', description: '無料会員の1日あたりAPI実行上限（回数）' },
    create: {
      key: 'free_user_daily_limit',
      value: '50',
      description: '無料会員の1日あたりAPI実行上限（回数）',
    },
  });

  await prisma.settings.upsert({
    where: { key: 'generate_api_model' },
    update: {},
    create: {
      key: 'generate_api_model',
      value: 'gemini-1.5-flash',
      description: 'SNS生成で使用するAPIモデル',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 