// test-connection.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // 간단히 DB 연결 테스트
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ DB 연결 성공!");
  } catch (err) {
    console.error("❌ DB 연결 실패:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
