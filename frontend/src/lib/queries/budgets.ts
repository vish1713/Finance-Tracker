'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client';
import type { Budget, BudgetPeriod, BudgetProgress } from '../types';

export interface CreateBudgetInput {
  categoryId?: string;
  amount: number;
  period?: BudgetPeriod;
  startDate: string;
  rollover?: boolean;
}

export function useBudgets() {
  return useQuery({ queryKey: ['budgets'], queryFn: () => api.get<Budget[]>('/budgets') });
}

export function useBudgetsProgress() {
  return useQuery({
    queryKey: ['budgets', 'progress'],
    queryFn: () => api.get<BudgetProgress[]>('/budgets/progress'),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) => api.post<Budget>('/budgets', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
