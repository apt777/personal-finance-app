import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed Currencies
  const currencies = [
    { code: 'KRW', name: 'South Korean Won', decimals: 0 },
    { code: 'JPY', name: 'Japanese Yen', decimals: 0 },
    { code: 'USD', name: 'United States Dollar', decimals: 2 },
    { code: 'EUR', name: 'Euro', decimals: 2 },
    { code: 'CNY', name: 'Chinese Yuan', decimals: 2 },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }
  console.log('Currencies seeded.');

  // Seed a dummy user (Supabase-managed, but for local dev, we can create one)
  // In a real app, this would come from Supabase Auth
  const dummyUser = await prisma.user.upsert({
    where: { id: 'clx0000000000000000000000' }, // Replace with a real Supabase user ID in production
    update: {},
    create: {
      id: 'clx0000000000000000000000',
    },
  });
  console.log('Dummy user seeded:', dummyUser.id);

  // Seed Categories
  const categories = [
    { userId: dummyUser.id, name: 'Food', type: 'expense', icon: '🍽️' },
    { userId: dummyUser.id, name: 'Transport', type: 'expense', icon: '🚗' },
    { userId: dummyUser.id, name: 'Rent', type: 'expense', icon: '🏠' },
    { userId: dummyUser.id, name: 'Salary', type: 'income', icon: '💰' },
    { userId: dummyUser.id, name: 'Utilities', type: 'expense', icon: '💡' },
    { userId: dummyUser.id, name: 'Entertainment', type: 'expense', icon: '🎉' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { userId_name: { userId: category.userId, name: category.name } }, // Unique constraint for upsert
      update: {},
      create: category,
    });
  }
  console.log('Categories seeded.');

  // Seed Accounts
  const accounts = [
    { userId: dummyUser.id, name: 'Cash (KRW)', currencyCode: 'KRW', type: 'cash', note: 'My physical cash' },
    { userId: dummyUser.id, name: 'Bank (JPY)', currencyCode: 'JPY', type: 'bank', note: 'My Japanese bank account' },
    { userId: dummyUser.id, name: 'Credit Card (USD)', currencyCode: 'USD', type: 'credit_card', note: 'My US credit card' },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { userId_name: { userId: account.userId, name: account.name } },
      update: {},
      create: account,
    });
  }
  console.log('Accounts seeded.');

  // Seed Mock Transactions (simplified for seeding)
  const cashAccount = await prisma.account.findFirst({ where: { name: 'Cash (KRW)' } });
  const foodCategory = await prisma.category.findFirst({ where: { name: 'Food' } });
  const salaryCategory = await prisma.category.findFirst({ where: { name: 'Salary' } });

  if (cashAccount && foodCategory && salaryCategory) {
    const transactions = [
      {
        userId: dummyUser.id,
        accountId: cashAccount.id,
        categoryId: foodCategory.id,
        type: 'expense',
        amountOriginal: 15000,
        currencyOriginal: 'KRW',
        amountBase: 15000, // Assuming KRW is base for this transaction
        currencyBase: 'KRW',
        memo: 'Lunch with friends',
        txDate: new Date('2024-08-20'),
      },
      {
        userId: dummyUser.id,
        accountId: cashAccount.id,
        categoryId: salaryCategory.id,
        type: 'income',
        amountOriginal: 3000000,
        currencyOriginal: 'KRW',
        amountBase: 3000000,
        currencyBase: 'KRW',
        memo: 'Monthly salary',
        txDate: new Date('2024-08-25'),
      },
    ];

    for (const transaction of transactions) {
      await prisma.transaction.create({ data: transaction });
    }
    console.log('Mock transactions seeded.');
  }

  // Seed one Holding
  const usdCurrency = await prisma.currency.findUnique({ where: { code: 'USD' } });
  if (usdCurrency) {
    await prisma.holding.upsert({
      where: { userId_symbol_exchange: { userId: dummyUser.id, symbol: 'AAPL', exchange: 'NASDAQ' } },
      update: {},
      create: {
        userId: dummyUser.id,
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        quantity: 10,
        avgCost: 170.50,
        currencyCode: 'USD',
        note: 'Apple Inc. shares',
      },
    });
    console.log('Mock holding seeded.');
  }

  // Seed default settings
  await prisma.setting.upsert({
    where: { userId: dummyUser.id },
    update: {},
    create: {
      userId: dummyUser.id,
      baseCurrency: 'KRW',
      displayCurrencies: ['JPY', 'USD'],
      locale: 'ko-KR',
      roundingRule: 'bankers_rounding',
    },
  });
  console.log('Default settings seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });