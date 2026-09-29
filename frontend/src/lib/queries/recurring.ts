'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client';
import type { RecurrenceFrequency, RecurringTransaction, TransactionType } from '../types';

export interface CreateRecurringInput {
  accountId: string;
  categoryId?: string;
  amount: number;
  type: TransactionType;
  description: string;
  frequency: RecurrenceFrequency;
  interval?: number;
  startDate: string;
  endDate?: string;
}

export function useRecurringTransactions() {
  return useQuery({
    queryKey: ['recurring-transactions'],
    queryFn: () => api.get<RecurringTransaction[]>('/recurring-transactions'),
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurringInput) =>
      api.post<RecurringTransaction>('/recurring-transactions', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }),
  });
}

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<CreateRecurringInput> & { id: string; isActive?: boolean }) =>
      api.patch<RecurringTransaction>(`/recurring-transactions/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }),
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-transactions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }),
  });
}
