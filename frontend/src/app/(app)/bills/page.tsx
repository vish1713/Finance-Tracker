'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useAccounts } from '@/lib/queries/accounts';
import { useCategories } from '@/lib/queries/categories';
import { useBills, useCreateBill, useDeleteBill, useMarkBillPaid } from '@/lib/queries/bills';
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/format';

const billSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  dueDate: z.string().min(1, 'Due date is required'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', '']).optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).optional(),
});

type BillForm = z.infer<typeof billSchema>;

export default function BillsPage() {
  const { data: bills, isLoading } = useBills();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories('EXPENSE');
  const createBill = useCreateBill();
  const markPaid = useMarkBillPaid();
  const deleteBill = useDeleteBill();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: { dueDate: toDateInputValue(new Date()), reminderDaysBefore: 3 },
  });

  const onSubmit = handleSubmit(async (values) => {
    await createBill.mutateAsync({
      ...values,
      frequency: values.frequency || undefined,
      accountId: values.accountId || undefined,
      categoryId: values.categoryId || undefined,
      dueDate: new Date(values.dueDate).toISOString(),
    });
    reset({
      dueDate: toDateInputValue(new Date()),
      reminderDaysBefore: 3,
      name: '',
      amount: undefined,
    });
    setModalOpen(false);
  });

  const sorted = [...(bills ?? [])].sort(
    (a, b) =>
      Number(a.isPaid) - Number(b.isPaid) ||
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bills</h1>
          <p className="text-sm text-slate-500">
            Upcoming and recurring bills, with automatic reminders.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Bill
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading bills…</p>
      ) : sorted.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No bills yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((bill) => {
            const overdue = !bill.isPaid && new Date(bill.dueDate) < new Date();
            return (
              <Card key={bill.id} className={bill.isPaid ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{bill.name}</p>
                    <p className="text-xs" style={{ color: overdue ? '#d03b3b' : '#898781' }}>
                      Due {formatDate(bill.dueDate)}
                      {bill.frequency ? ` · ${bill.frequency.toLowerCase()}` : ''}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
                <div className="mt-4 flex gap-3 text-xs">
                  {!bill.isPaid && (
                    <button
                      onClick={() => markPaid.mutate(bill.id)}
                      className="font-medium text-green-700 hover:text-green-900"
                    >
                      Mark Paid
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${bill.name}"?`)) deleteBill.mutate(bill.id);
                    }}
                    className="font-medium text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Bill">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
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
              <label className="block text-sm font-medium text-slate-700">Due Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('dueDate')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Repeats</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('frequency')}
            >
              <option value="">One-time</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Pay From Account</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('accountId')}
            >
              <option value="">None (don&apos;t log a transaction)</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('categoryId')}
            >
              <option value="">Uncategorized</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Remind me (days before)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('reminderDaysBefore')}
            />
          </div>

          <button
            type="submit"
            disabled={createBill.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {createBill.isPending ? 'Creating…' : 'Create Bill'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
