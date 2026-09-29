'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client';
import type {
  Investment,
  InvestmentType,
  InvestmentValueHistoryPoint,
  PortfolioSummary,
} from '../types';

export interface CreateInvestmentInput {
  name: string;
  type: InvestmentType;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  notes?: string;
}

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: () => api.get<Investment[]>('/investments'),
  });
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ['investments', 'portfolio-summary'],
    queryFn: () => api.get<PortfolioSummary>('/investments/portfolio-summary'),
  });
}

export function useInvestmentValueHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['investments', id, 'value-history'],
    queryFn: () => api.get<InvestmentValueHistoryPoint[]>(`/investments/${id}/value-history`),
    enabled: Boolean(id),
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvestmentInput) => api.post<Investment>('/investments', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investments'] }),
  });
}

export function useAddValueSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      api.post(`/investments/${id}/value-history`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investments'] }),
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/investments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investments'] }),
  });
}
