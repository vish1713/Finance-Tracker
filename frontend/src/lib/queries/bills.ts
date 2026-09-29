'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client';
import type { Bill, RecurrenceFrequency } from '../types';

export interface CreateBillInput {
  name: string;
  amount: number;
  dueDate: string;
  frequency?: RecurrenceFrequency;
  accountId?: string;
  categoryId?: string;
  reminderDaysBefore?: number;
}

export function useBills() {
  return useQuery({ queryKey: ['bills'], queryFn: () => api.get<Bill[]>('/bills') });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillInput) => api.post<Bill>('/bills', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });
}

export function useMarkBillPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Bill>(`/bills/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/bills/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });
}
