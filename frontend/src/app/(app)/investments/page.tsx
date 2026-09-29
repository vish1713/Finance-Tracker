'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import {
  useAddValueSnapshot,
  useCreateInvestment,
  useDeleteInvestment,
  usePortfolioSummary,
} from '@/lib/queries/investments';
import { formatCurrency, toDateInputValue } from '@/lib/format';
import type { InvestmentType } from '@/lib/types';

const INVESTMENT_TYPES: InvestmentType[] = [
  'STOCK',
  'MUTUAL_FUND',
  'CRYPTO',
  'BOND',
  'FD',
  'OTHER',
];

const investmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  type: z.enum(['STOCK', 'MUTUAL_FUND', 'CRYPTO', 'BOND', 'FD', 'OTHER']),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  purchasePrice: z.coerce.number().positive('Purchase price must be greater than zero'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
});

type InvestmentForm = z.infer<typeof investmentSchema>;

const TYPE_LABELS: Record<InvestmentType, string> = {
  STOCK: 'Stock',
  MUTUAL_FUND: 'Mutual Fund',
  CRYPTO: 'Crypto',
  BOND: 'Bond',
  FD: 'Fixed Deposit',
  OTHER: 'Other',
};

export default function InvestmentsPage() {
  const { data: portfolio, isLoading } = usePortfolioSummary();
  const createInvestment = useCreateInvestment();
  const addSnapshot = useAddValueSnapshot();
  const deleteInvestment = useDeleteInvestment();
  const [modalOpen, setModalOpen] = useState(false);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [snapshotValue, setSnapshotValue] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvestmentForm>({
    resolver: zodResolver(investmentSchema),
    defaultValues: { type: 'STOCK', purchaseDate: toDateInputValue(new Date()) },
  });

  const onSubmit = handleSubmit(async (values) => {
    await createInvestment.mutateAsync({
      ...values,
      purchaseDate: new Date(values.purchaseDate).toISOString(),
    });
    reset({ type: 'STOCK', purchaseDate: toDateInputValue(new Date()) });
    setModalOpen(false);
  });

  const submitSnapshot = async (id: string) => {
    const value = Number(snapshotValue);
    if (!value || value <= 0) return;
    await addSnapshot.mutateAsync({ id, value });
    setSnapshotId(null);
    setSnapshotValue('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Investments</h1>
          <p className="text-sm text-slate-500">
            Manual holdings with valuation history over time.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Holding
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading portfolio…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-500">Cost Basis</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatCurrency(portfolio?.totalCostBasis ?? 0)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Current Value</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatCurrency(portfolio?.totalCurrentValue ?? 0)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Gain / Loss</p>
              <p
                className="mt-1 text-xl font-semibold"
                style={{ color: (portfolio?.totalGainLoss ?? 0) >= 0 ? '#006300' : '#d03b3b' }}
              >
                {formatCurrency(portfolio?.totalGainLoss ?? 0)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Return</p>
              <p
                className="mt-1 text-xl font-semibold"
                style={{
                  color: (portfolio?.totalGainLossPercent ?? 0) >= 0 ? '#006300' : '#d03b3b',
                }}
              >
                {(portfolio?.totalGainLossPercent ?? 0).toFixed(1)}%
              </p>
            </Card>
          </div>

          {portfolio?.holdings.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">No holdings yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio?.holdings.map((holding) => (
                <Card key={holding.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{holding.name}</p>
                      <p className="text-xs text-slate-500">{TYPE_LABELS[holding.type]}</p>
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: holding.gainLoss >= 0 ? '#006300' : '#d03b3b' }}
                    >
                      {holding.gainLossPercent >= 0 ? '+' : ''}
                      {holding.gainLossPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-slate-900">
                    {formatCurrency(holding.currentValue)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cost basis {formatCurrency(holding.costBasis)}
                  </p>

                  <div className="mt-4">
                    {snapshotId === holding.id ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={snapshotValue}
                          onChange={(e) => setSnapshotValue(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          placeholder="Current value"
                        />
                        <button
                          onClick={() => submitSnapshot(holding.id)}
                          className="shrink-0 rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setSnapshotId(null)}
                          className="shrink-0 text-xs font-medium text-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3 text-xs">
                        <button
                          onClick={() => setSnapshotId(holding.id)}
                          className="font-medium text-slate-600 hover:text-slate-900"
                        >
                          Update Value
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${holding.name}"?`))
                              deleteInvestment.mutate(holding.id);
                          }}
                          className="font-medium text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Holding">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('type')}
            >
              {INVESTMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                step="0.000001"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Purchase Price</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('purchasePrice')}
              />
              {errors.purchasePrice && (
                <p className="mt-1 text-xs text-red-600">{errors.purchasePrice.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Purchase Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('purchaseDate')}
            />
          </div>

          <button
            type="submit"
            disabled={createInvestment.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {createInvestment.isPending ? 'Creating…' : 'Create Holding'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
