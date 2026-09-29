'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  useCategoryBreakdown,
  useDashboardSummary,
  useIncomeExpenseTrend,
  useNetWorthTrend,
} from '@/lib/queries/analytics';

const INK_SECONDARY = '#52514e';
const INK_MUTED = '#898781';
const GRIDLINE = '#e1e0d9';
const SERIES_INCOME = '#2a78d6';
const SERIES_EXPENSE = '#eb6834';

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'critical';
}) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className="mt-1 text-2xl font-semibold"
        style={{ color: tone === 'good' ? '#006300' : tone === 'critical' ? '#d03b3b' : '#0b0b0b' }}
      >
        {value}
      </p>
    </Card>
  );
}

const axisTickStyle = { fill: INK_MUTED, fontSize: 12 };

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: trend } = useIncomeExpenseTrend(6);
  const { data: netWorth } = useNetWorthTrend(6);
  const { data: categoryBreakdown } = useCategoryBreakdown();

  const rankedCategories = [...(categoryBreakdown ?? [])]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Your financial overview for this month.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total Balance"
          value={summaryLoading ? '—' : formatCurrency(summary?.totalBalance ?? 0)}
        />
        <StatTile
          label="Income (this month)"
          value={summaryLoading ? '—' : formatCurrency(summary?.monthIncome ?? 0)}
          tone="good"
        />
        <StatTile
          label="Expense (this month)"
          value={summaryLoading ? '—' : formatCurrency(summary?.monthExpense ?? 0)}
        />
        <StatTile
          label="Net (this month)"
          value={summaryLoading ? '—' : formatCurrency(summary?.monthNet ?? 0)}
          tone={(summary?.monthNet ?? 0) >= 0 ? 'good' : 'critical'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-medium text-slate-900">Income vs. Expense (6 months)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend ?? []}>
              <CartesianGrid stroke={GRIDLINE} vertical={false} />
              <XAxis
                dataKey="month"
                tick={axisTickStyle}
                axisLine={{ stroke: '#c3c2b7' }}
                tickLine={false}
              />
              <YAxis
                tick={axisTickStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRIDLINE }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: INK_SECONDARY }} />
              <Bar dataKey="income" name="Income" fill={SERIES_INCOME} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill={SERIES_EXPENSE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-medium text-slate-900">Net Worth Trend (6 months)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={netWorth ?? []}>
              <CartesianGrid stroke={GRIDLINE} vertical={false} />
              <XAxis
                dataKey="month"
                tick={axisTickStyle}
                axisLine={{ stroke: '#c3c2b7' }}
                tickLine={false}
              />
              <YAxis
                tick={axisTickStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRIDLINE }}
              />
              <Line
                type="monotone"
                dataKey="netWorth"
                name="Net worth"
                stroke={SERIES_INCOME}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-medium text-slate-900">
            Spending by Category (this month)
          </h2>
          {rankedCategories.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses recorded this month yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, rankedCategories.length * 34)}>
              <BarChart data={rankedCategories} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke={GRIDLINE} horizontal={false} />
                <XAxis
                  type="number"
                  tick={axisTickStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  tick={axisTickStyle}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRIDLINE }}
                />
                <Bar dataKey="amount" name="Spent" fill={SERIES_INCOME} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-medium text-slate-900">Upcoming Bills</h2>
          {summary?.upcomingBills.length === 0 || !summary ? (
            <p className="text-sm text-slate-400">No bills due in the next 7 days.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.upcomingBills.map((bill) => (
                <li key={bill.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{bill.name}</p>
                    <p className="text-xs text-slate-500">Due {formatDate(bill.dueDate)}</p>
                  </div>
                  <span className="font-medium text-slate-900">{formatCurrency(bill.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-2 mt-6 text-sm font-medium text-slate-900">Recent Transactions</h2>
          {!summary || summary.recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.recentTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                  </div>
                  <span
                    className="font-medium"
                    style={{ color: tx.type === 'EXPENSE' ? '#d03b3b' : '#006300' }}
                  >
                    {tx.type === 'EXPENSE' ? '-' : '+'}
                    {formatCurrency(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
