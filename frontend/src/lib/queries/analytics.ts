'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../api-client';
import type { CategoryBreakdownItem, DashboardSummary, NetWorthPoint, TrendPoint } from '../types';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.get<DashboardSummary>('/analytics/dashboard'),
  });
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: ['analytics', 'category-breakdown'],
    queryFn: () => api.get<CategoryBreakdownItem[]>('/analytics/category-breakdown'),
  });
}

export function useIncomeExpenseTrend(months = 6) {
  return useQuery({
    queryKey: ['analytics', 'income-expense-trend', months],
    queryFn: () => api.get<TrendPoint[]>(`/analytics/income-expense-trend?months=${months}`),
  });
}

export function useNetWorthTrend(months = 6) {
  return useQuery({
    queryKey: ['analytics', 'net-worth-trend', months],
    queryFn: () => api.get<NetWorthPoint[]>(`/analytics/net-worth-trend?months=${months}`),
  });
}
