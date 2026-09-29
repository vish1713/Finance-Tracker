'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '../api-client';
import { setTokens } from '../auth-storage';
import type { AuthResponse } from '../types';

export function useLogin() {
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<AuthResponse>('/auth/login', input, { skipAuth: true }),
    onSuccess: (data) => setTokens(data.accessToken, data.refreshToken),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: { email: string; password: string; name: string }) =>
      api.post<AuthResponse>('/auth/register', input, { skipAuth: true }),
    onSuccess: (data) => setTokens(data.accessToken, data.refreshToken),
  });
}
