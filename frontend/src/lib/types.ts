export type AccountType = 'BANK' | 'CASH' | 'CREDIT_CARD' | 'WALLET' | 'INVESTMENT';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type InvestmentType = 'STOCK' | 'MUTUAL_FUND' | 'CRYPTO' | 'BOND' | 'FD' | 'OTHER';
export type NotificationType = 'BILL_REMINDER' | 'BUDGET_ALERT' | 'GOAL_MILESTONE' | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  baseCurrency: string;
  timezone: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: string;
  balance: string;
  currency: string;
  color?: string | null;
  icon?: string | null;
  isArchived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  amount: string;
  date: string;
  description: string;
  notes?: string | null;
  attachmentUrl?: string | null;
  transferAccountId?: string | null;
  account?: Account;
  category?: Category | null;
  transferAccount?: Account | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Budget {
  id: string;
  categoryId?: string | null;
  category?: Category | null;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  rollover: boolean;
}

export interface BudgetProgress {
  budget: Budget;
  periodStart: string;
  periodEnd: string;
  spent: number;
  effectiveAmount: number;
  remaining: number;
  percentUsed: number;
}

export interface RecurringTransaction {
  id: string;
  accountId: string;
  categoryId?: string | null;
  amount: string;
  type: TransactionType;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  lastRunDate?: string | null;
  isActive: boolean;
}

export interface Bill {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  frequency?: RecurrenceFrequency | null;
  accountId?: string | null;
  categoryId?: string | null;
  reminderDaysBefore: number;
  isPaid: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate?: string | null;
  linkedAccountId?: string | null;
  isAchieved: boolean;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  quantity: string;
  purchasePrice: string;
  purchaseDate: string;
  notes?: string | null;
}

export interface InvestmentValueHistoryPoint {
  id: string;
  value: string;
  recordedAt: string;
}

export interface PortfolioHolding {
  id: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  costBasis: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface PortfolioSummary {
  holdings: PortfolioHolding[];
  totalCostBasis: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  totalBalance: number;
  accountCount: number;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  upcomingBills: Bill[];
  recentTransactions: Transaction[];
}

export interface CategoryBreakdownItem {
  categoryId: string | null;
  categoryName: string;
  color: string | null;
  amount: number;
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface NetWorthPoint {
  month: string;
  netWorth: number;
}
