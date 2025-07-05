const { PrismaClient } = require('@prisma/client');

async function addGenerateSetting() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.settings.upsert({
      where: { key: 'generate_api_model' },
      update: {},
      create: {
        key: 'generate_api_model',
        value: 'gemini-1.5-flash',
        description: 'SNS生成で使用するAPIモデル'
      }
    });
    
    console.log('✅ generate_api_model setting added successfully');
  } catch (error) {
    console.error('❌ Error adding setting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addGenerateSetting();