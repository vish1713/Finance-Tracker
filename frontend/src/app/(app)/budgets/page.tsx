'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useCategories } from '@/lib/queries/categories';
import { useBudgetsProgress, useCreateBudget, useDeleteBudget } from '@/lib/queries/budgets';
import { formatCurrency, toDateInputValue } from '@/lib/format';

const budgetSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().min(1, 'Start date is required'),
  rollover: z.boolean().optional(),
});

type BudgetForm = z.infer<typeof budgetSchema>;

function progressColor(percentUsed: number): string {
  if (percentUsed >= 100) return '#d03b3b';
  if (percentUsed >= 80) return '#fab219';
  return '#2a78d6';
}

export default function BudgetsPage() {
  const { data: progress, isLoading } = useBudgetsProgress();
  const { data: categories } = useCategories('EXPENSE');
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { period: 'MONTHLY', startDate: toDateInputValue(new Date()) },
  });

  const onSubmit = handleSubmit(async (values) => {
    await createBudget.mutateAsync({
      ...values,
      categoryId: values.categoryId || undefined,
      startDate: new Date(values.startDate).toISOString(),
    });
    reset({ period: 'MONTHLY', startDate: toDateInputValue(new Date()), amount: undefined });
    setModalOpen(false);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Budgets</h1>
          <p className="text-sm text-slate-500">
            Track spending against a plan, per category or overall.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Budget
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading budgets…</p>
      ) : progress?.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No budgets yet. Create one to start tracking spending.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {progress?.map((p) => {
            const pct = Math.min(100, Math.max(0, p.percentUsed));
            return (
              <Card key={p.budget.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {p.budget.category?.name ?? 'Overall'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {p.budget.period.toLowerCase()}
                      {p.budget.rollover ? ' · rollover' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Delete this budget?')) deleteBudget.mutate(p.budget.id);
                    }}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-900">{formatCurrency(p.spent)}</span>
                    <span className="text-slate-500">of {formatCurrency(p.effectiveAmount)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: progressColor(p.percentUsed) }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.remaining >= 0
                      ? `${formatCurrency(p.remaining)} remaining`
                      : `${formatCurrency(Math.abs(p.remaining))} over budget`}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Budget">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('categoryId')}
            >
              <option value="">Overall (all expenses)</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Period</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('period')}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Start Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('startDate')}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('rollover')} />
            Roll over unused amount from the previous period
          </label>

          <button
            type="submit"
            disabled={createBudget.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {createBudget.isPending ? 'Creating…' : 'Create Budget'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
