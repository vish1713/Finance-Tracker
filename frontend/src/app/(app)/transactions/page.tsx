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
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  type TransactionFilters,
} from '@/lib/queries/transactions';
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/format';
import type { TransactionType } from '@/lib/types';

const transactionSchema = z
  .object({
    accountId: z.string().min(1, 'Account is required'),
    categoryId: z.string().optional(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required').max(255),
    transferAccountId: z.string().optional(),
  })
  .refine((data) => data.type !== 'TRANSFER' || Boolean(data.transferAccountId), {
    message: 'Destination account is required for a transfer',
    path: ['transferAccountId'],
  });

type TransactionForm = z.infer<typeof transactionSchema>;

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: transactions, isLoading } = useTransactions(filters);
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'EXPENSE', date: toDateInputValue(new Date()) },
  });
  const watchedType = useWatch({ control, name: 'type' });

  const onSubmit = handleSubmit(async (values) => {
    await createTransaction.mutateAsync({
      ...values,
      date: new Date(values.date).toISOString(),
      categoryId: values.categoryId || undefined,
      transferAccountId: values.type === 'TRANSFER' ? values.transferAccountId : undefined,
    });
    reset({
      type: 'EXPENSE',
      date: toDateInputValue(new Date()),
      description: '',
      amount: undefined,
    });
    setModalOpen(false);
  });

  const meta = transactions?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">
            Every income, expense, and transfer in one ledger.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Transaction
        </button>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={filters.accountId ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, accountId: e.target.value || undefined, page: 1 }))
            }
          >
            <option value="">All accounts</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={filters.categoryId ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))
            }
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={filters.type ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                type: (e.target.value || undefined) as TransactionType | undefined,
                page: 1,
              }))
            }
          >
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={filters.from ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from: e.target.value || undefined, page: 1 }))
            }
          />
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={filters.to ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, to: e.target.value || undefined, page: 1 }))
            }
          />
        </div>
        <input
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="Search description…"
          value={filters.q ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
        />
      </Card>

      <Card className="!p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading transactions…</p>
        ) : transactions?.items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No transactions match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {transactions?.items.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-2 text-slate-900">{tx.description}</td>
                    <td className="px-4 py-2 text-slate-600">{tx.account?.name}</td>
                    <td className="px-4 py-2 text-slate-600">{tx.category?.name ?? '—'}</td>
                    <td
                      className="whitespace-nowrap px-4 py-2 text-right font-medium"
                      style={{ color: tx.type === 'EXPENSE' ? '#d03b3b' : '#006300' }}
                    >
                      {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Delete this transaction?')) deleteTransaction.mutate(tx.id);
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

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Transaction">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('type')}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              {watchedType === 'TRANSFER' ? 'From Account' : 'Account'}
            </label>
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

          {watchedType === 'TRANSFER' && (
            <div>
              <label className="block text-sm font-medium text-slate-700">To Account</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('transferAccountId')}
              >
                <option value="">Select destination account</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {errors.transferAccountId && (
                <p className="mt-1 text-xs text-red-600">{errors.transferAccountId.message}</p>
              )}
            </div>
          )}

          {watchedType !== 'TRANSFER' && (
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
          )}

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
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('date')}
              />
            </div>
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

          <button
            type="submit"
            disabled={createTransaction.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {createTransaction.isPending ? 'Saving…' : 'Save Transaction'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
