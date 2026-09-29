'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/format';
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/lib/queries/accounts';
import type { AccountType } from '@/lib/types';

const ACCOUNT_TYPES: AccountType[] = ['BANK', 'CASH', 'CREDIT_CARD', 'WALLET', 'INVESTMENT'];

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  type: z.enum(['BANK', 'CASH', 'CREDIT_CARD', 'WALLET', 'INVESTMENT']),
  openingBalance: z.coerce.number().optional(),
  currency: z.string().optional(),
});

type AccountForm = z.infer<typeof accountSchema>;

const TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Bank',
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  WALLET: 'Wallet',
  INVESTMENT: 'Investment',
};

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { type: 'BANK', currency: 'USD' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await createAccount.mutateAsync(values);
    reset({ type: 'BANK', currency: 'USD', name: '', openingBalance: undefined });
    setModalOpen(false);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Accounts</h1>
          <p className="text-sm text-slate-500">Bank accounts, cash, credit cards, and wallets.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Account
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading accounts…</p>
      ) : accounts?.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No accounts yet. Create one to start tracking transactions.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account) => (
            <Card key={account.id} className={account.isArchived ? 'opacity-50' : ''}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">{account.name}</p>
                  <p className="text-xs text-slate-500">{TYPE_LABELS[account.type]}</p>
                </div>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: account.color ?? '#2a78d6' }}
                />
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {formatCurrency(account.balance, account.currency)}
              </p>
              <div className="mt-4 flex gap-3 text-xs">
                <button
                  onClick={() =>
                    updateAccount.mutate({ id: account.id, isArchived: !account.isArchived })
                  }
                  className="font-medium text-slate-500 hover:text-slate-900"
                >
                  {account.isArchived ? 'Unarchive' : 'Archive'}
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete "${account.name}"? This is only possible if it has no transactions.`,
                      )
                    ) {
                      deleteAccount.mutate(account.id);
                    }
                  }}
                  className="font-medium text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Account">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              {...register('type')}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Opening Balance</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              {...register('openingBalance')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Currency</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              {...register('currency')}
            />
          </div>

          <button
            type="submit"
            disabled={createAccount.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {createAccount.isPending ? 'Creating…' : 'Create Account'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
