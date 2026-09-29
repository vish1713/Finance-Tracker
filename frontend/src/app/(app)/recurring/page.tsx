'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useAccounts } from '@/lib/queries/accounts';
import { useCategories } from '@/lib/queries/categories';
import {
  useCreateRecurringTransaction,
  useDeleteRecurringTransaction,
  useRecurringTransactions,
  useUpdateRecurringTransaction,
} from '@/lib/queries/recurring';
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/format';

const recurringSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  description: z.string().min(1, 'Description is required').max(255),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.coerce.number().int().min(1).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
});

type RecurringForm = z.infer<typeof recurringSchema>;

export default function RecurringPage() {
  const { data: recurring, isLoading } = useRecurringTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const createRecurring = useCreateRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecurringForm>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      type: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: toDateInputValue(new Date()),
    },
  });
  const watchedType = useWatch({ control, name: 'type' });

  const onSubmit = handleSubmit(async (values) => {
    await createRecurring.mutateAsync({
      ...values,
      categoryId: values.categoryId || undefined,
      startDate: new Date(values.startDate).toISOString(),
      endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
    });
    reset({ type: 'EXPENSE', frequency: 'MONTHLY', startDate: toDateInputValue(new Date()) });
    setModalOpen(false);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Recurring Transactions</h1>
          <p className="text-sm text-slate-500">
            Automated income and expenses — processed hourly in the background.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Recurring
        </button>
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : recurring?.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No recurring transactions set up yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Frequency</th>
                  <th className="px-4 py-2 font-medium">Next Run</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Active</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {recurring?.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-900">{r.description}</td>
                    <td className="px-4 py-2 capitalize text-slate-600">
                      {r.frequency.toLowerCase()}
                      {r.interval > 1 ? ` (every ${r.interval})` : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                      {formatDate(r.nextRunDate)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-2 text-right font-medium"
                      style={{ color: r.type === 'EXPENSE' ? '#d03b3b' : '#006300' }}
                    >
                      {r.type === 'EXPENSE' ? '-' : '+'}
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => updateRecurring.mutate({ id: r.id, isActive: !r.isActive })}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Delete this recurring transaction?'))
                            deleteRecurring.mutate(r.id);
                        }}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Recurring Transaction">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('type')}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Account</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('accountId')}
            >
              <option value="">Select an account</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.accountId && (
              <p className="mt-1 text-xs text-red-600">{errors.accountId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('categoryId')}
            >
              <option value="">Uncategorized</option>
              {categories
                ?.filter((c) => c.type === watchedType)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('description')}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
            )}
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
              <label className="block text-sm font-medium text-slate-700">Frequency</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('frequency')}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Start Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('startDate')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                End Date (optional)
              </label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('endDate')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createRecurring.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {createRecurring.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
