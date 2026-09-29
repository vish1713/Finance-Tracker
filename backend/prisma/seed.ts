import {
  AccountType,
  BudgetPeriod,
  CategoryType,
  InvestmentType,
  PrismaClient,
  RecurrenceFrequency,
  TransactionType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { addDays, addMonths, startOfMonth, subDays, subMonths } from 'date-fns';

const prisma = new PrismaClient();

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Groceries', icon: '🛒', color: '#22c55e' },
  { name: 'Rent', icon: '🏠', color: '#ef4444' },
  { name: 'Utilities', icon: '💡', color: '#f59e0b' },
  { name: 'Transportation', icon: '🚗', color: '#3b82f6' },
  { name: 'Dining Out', icon: '🍽️', color: '#f97316' },
  { name: 'Entertainment', icon: '🎬', color: '#a855f7' },
  { name: 'Health & Fitness', icon: '💊', color: '#14b8a6' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Insurance', icon: '🛡️', color: '#64748b' },
  { name: 'Education', icon: '📚', color: '#0ea5e9' },
  { name: 'Subscriptions', icon: '📺', color: '#8b5cf6' },
  { name: 'Miscellaneous', icon: '📦', color: '#94a3b8' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: '💼', color: '#16a34a' },
  { name: 'Freelance', icon: '🧑‍💻', color: '#0891b2' },
  { name: 'Investment Income', icon: '📈', color: '#7c3aed' },
  { name: 'Gifts', icon: '🎁', color: '#db2777' },
  { name: 'Other Income', icon: '➕', color: '#65a30d' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedDefaultCategories() {
  const categories: { id: string; name: string; type: CategoryType }[] = [];

  for (const category of DEFAULT_EXPENSE_CATEGORIES) {
    const id = `sys-expense-${slugify(category.name)}`;
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: { id, userId: null, type: CategoryType.EXPENSE, ...category },
    });
    categories.push({ id, name: category.name, type: CategoryType.EXPENSE });
  }

  for (const category of DEFAULT_INCOME_CATEGORIES) {
    const id = `sys-income-${slugify(category.name)}`;
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: { id, userId: null, type: CategoryType.INCOME, ...category },
    });
    categories.push({ id, name: category.name, type: CategoryType.INCOME });
  }

  console.log(`Seeded ${categories.length} default categories`);
  return categories;
}

async function seedDemoUser(categories: { id: string; name: string; type: CategoryType }[]) {
  const email = 'demo@financetracker.dev';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo user already exists (${email}) — skipping demo data seed`);
    return;
  }

  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));
  const passwordHash = await argon2.hash('Password123!');

  const user = await prisma.user.create({
    data: { email, passwordHash, name: 'Demo User', baseCurrency: 'USD' },
  });

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Checking',
      type: AccountType.BANK,
      openingBalance: 2000,
      balance: 2000,
      currency: 'USD',
      color: '#3b82f6',
    },
  });
  const cash = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Cash Wallet',
      type: AccountType.CASH,
      openingBalance: 200,
      balance: 200,
      currency: 'USD',
      color: '#22c55e',
    },
  });

  // Manually applied so seeded account balances stay in sync with the seeded ledger,
  // without going through the app's HTTP/service layer.
  const balances = new Map<string, number>([
    [checking.id, Number(checking.openingBalance)],
    [cash.id, Number(cash.openingBalance)],
  ]);
  const applyDelta = (accountId: string, delta: number) => {
    balances.set(accountId, (balances.get(accountId) ?? 0) + delta);
  };

  const now = new Date();
  // prettier-ignore
  const sampleTransactions: {
    accountId: string;
    categoryName: string;
    type: TransactionType;
    amount: number;
    daysAgo: number;
    description: string;
  }[] = [
    { accountId: checking.id, categoryName: 'Salary', type: TransactionType.INCOME, amount: 3200, daysAgo: 58, description: 'Monthly salary' },
    { accountId: checking.id, categoryName: 'Rent', type: TransactionType.EXPENSE, amount: 1200, daysAgo: 56, description: 'Rent payment' },
    { accountId: checking.id, categoryName: 'Groceries', type: TransactionType.EXPENSE, amount: 145.5, daysAgo: 50, description: 'Weekly groceries' },
    { accountId: cash.id, categoryName: 'Dining Out', type: TransactionType.EXPENSE, amount: 62.3, daysAgo: 45, description: 'Dinner with friends' },
    { accountId: checking.id, categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 98.2, daysAgo: 40, description: 'Electricity bill' },
    { accountId: checking.id, categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 55, daysAgo: 33, description: 'Gas' },
    { accountId: checking.id, categoryName: 'Salary', type: TransactionType.INCOME, amount: 3200, daysAgo: 28, description: 'Monthly salary' },
    { accountId: checking.id, categoryName: 'Rent', type: TransactionType.EXPENSE, amount: 1200, daysAgo: 26, description: 'Rent payment' },
    { accountId: checking.id, categoryName: 'Groceries', type: TransactionType.EXPENSE, amount: 132.8, daysAgo: 20, description: 'Weekly groceries' },
    { accountId: cash.id, categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 40, daysAgo: 15, description: 'Movie night' },
    { accountId: checking.id, categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 25.99, daysAgo: 10, description: 'Streaming subscription' },
    { accountId: cash.id, categoryName: 'Dining Out', type: TransactionType.EXPENSE, amount: 38.4, daysAgo: 4, description: 'Lunch out' },
  ];

  for (const tx of sampleTransactions) {
    const categoryId = categoryByName.get(tx.categoryName);
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: tx.accountId,
        categoryId,
        type: tx.type,
        amount: tx.amount,
        date: subDays(now, tx.daysAgo),
        description: tx.description,
      },
    });
    applyDelta(tx.accountId, tx.type === TransactionType.INCOME ? tx.amount : -tx.amount);
  }

  await prisma.account.update({
    where: { id: checking.id },
    data: { balance: balances.get(checking.id) },
  });
  await prisma.account.update({ where: { id: cash.id }, data: { balance: balances.get(cash.id) } });

  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      categoryId: categoryByName.get('Salary'),
      amount: 3200,
      type: TransactionType.INCOME,
      description: 'Monthly salary',
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(startOfMonth(now), 2),
      nextRunDate: addMonths(startOfMonth(now), 1),
      isActive: true,
    },
  });

  await prisma.bill.create({
    data: {
      userId: user.id,
      name: 'Rent',
      amount: 1200,
      dueDate: addMonths(startOfMonth(now), 1),
      frequency: RecurrenceFrequency.MONTHLY,
      accountId: checking.id,
      categoryId: categoryByName.get('Rent'),
      reminderDaysBefore: 5,
    },
  });

  await prisma.budget.create({
    data: {
      userId: user.id,
      categoryId: categoryByName.get('Dining Out'),
      amount: 300,
      period: BudgetPeriod.MONTHLY,
      startDate: startOfMonth(now),
      rollover: false,
    },
  });

  await prisma.goal.create({
    data: {
      userId: user.id,
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 2500,
      targetDate: addDays(now, 365),
      linkedAccountId: checking.id,
    },
  });

  const investment = await prisma.investment.create({
    data: {
      userId: user.id,
      name: 'Demo Index ETF',
      type: InvestmentType.STOCK,
      quantity: 10,
      purchasePrice: 150,
      purchaseDate: subMonths(now, 6),
    },
  });
  await prisma.investmentValueHistory.create({
    data: { investmentId: investment.id, value: 1650, recordedAt: now },
  });

  console.log(`Seeded demo user ${email} (password: Password123!)`);
}

async function main() {
  const categories = await seedDefaultCategories();
  await seedDemoUser(categories);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
