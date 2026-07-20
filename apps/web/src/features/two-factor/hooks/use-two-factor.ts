import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface TwoFactorSetupResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface TwoFactorConfirmResponse {
  message: string;
  recoveryCodes: string[];
}

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: () => api.post<TwoFactorSetupResponse>("/auth/2fa/setup"),
  });
}

export function useConfirmTwoFactor() {
  return useMutation({
    mutationFn: (code: string) => api.post<TwoFactorConfirmResponse>("/auth/2fa/confirm", { code }),
  });
}

export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: (password: string) => api.post<{ message: string }>("/auth/2fa/disable", { password }),
  });
}
