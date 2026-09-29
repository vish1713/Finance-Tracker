'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useAccounts } from '@/lib/queries/accounts';
import { useContributeGoal, useCreateGoal, useDeleteGoal, useGoals } from '@/lib/queries/goals';
import { formatCurrency, formatDate } from '@/lib/format';

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  targetAmount: z.coerce.number().positive('Target must be greater than zero'),
  targetDate: z.string().optional(),
  linkedAccountId: z.string().optional(),
});

type GoalForm = z.infer<typeof goalSchema>;

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const { data: accounts } = useAccounts();
  const createGoal = useCreateGoal();
  const contributeGoal = useContributeGoal();
  const deleteGoal = useDeleteGoal();
  const [modalOpen, setModalOpen] = useState(false);
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalForm>({ resolver: zodResolver(goalSchema) });

  const onSubmit = handleSubmit(async (values) => {
    await createGoal.mutateAsync({
      ...values,
      linkedAccountId: values.linkedAccountId || undefined,
      targetDate: values.targetDate ? new Date(values.targetDate).toISOString() : undefined,
    });
    reset({ name: '', targetAmount: undefined, targetDate: undefined, linkedAccountId: undefined });
    setModalOpen(false);
  });

  const submitContribution = async (id: string) => {
    const amount = Number(contributionAmount);
    if (!amount || amount <= 0) return;
    await contributeGoal.mutateAsync({ id, amount });
    setContributingId(null);
    setContributionAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Goals</h1>
          <p className="text-sm text-slate-500">Savings targets, tracked toward completion.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Goal
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading goals…</p>
      ) : goals?.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No goals yet. Create one to start saving toward it.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals?.map((goal) => {
            const pct = Math.min(
              100,
              (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 || 0,
            );
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{goal.name}</p>
                    {goal.targetDate && (
                      <p className="text-xs text-slate-500">Target {formatDate(goal.targetDate)}</p>
                    )}
                  </div>
                  {goal.isAchieved && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Achieved
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-900">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-slate-500">of {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2a78d6] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  {contributingId === goal.id ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        placeholder="Amount"
                      />
                      <button
                        onClick={() => submitContribution(goal.id)}
                        className="shrink-0 rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setContributingId(null)}
                        className="shrink-0 text-xs font-medium text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={() => setContributingId(goal.id)}
                        className="font-medium text-slate-600 hover:text-slate-900"
                      >
                        Add Contribution
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${goal.name}"?`)) deleteGoal.mutate(goal.id);
                        }}
                        className="font-medium text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Goal">
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
            <label className="block text-sm font-medium text-slate-700">Target Amount</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('targetAmount')}
            />
            {errors.targetAmount && (
              <p className="mt-1 text-xs text-red-600">{errors.targetAmount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Target Date (optional)
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('targetDate')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Linked Account (optional)
            </label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('linkedAccountId')}
            >
              <option value="">None</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={createGoal.isPending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {createGoal.isPending ? 'Creating…' : 'Create Goal'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
