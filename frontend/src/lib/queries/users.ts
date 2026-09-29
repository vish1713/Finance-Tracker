'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client';
import type { User } from '../types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; baseCurrency?: string; timezone?: string }) =>
      api.patch<User>('/users/me', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.patch('/users/me/password', input),
  });
}
