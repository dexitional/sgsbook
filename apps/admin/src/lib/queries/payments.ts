import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";
import type { Paginated, Payment } from "../types.js";

export interface PaymentsQuery {
  requestId?: string;
  page: number;
  pageSize: number;
}

export function usePayments(query: PaymentsQuery) {
  return useQuery({
    queryKey: ["payments", query],
    queryFn: () => api.get<Paginated<Payment>>("/payments", query),
    placeholderData: (prev) => prev,
  });
}

export function usePayment(id: string | null) {
  return useQuery({
    queryKey: ["payments", id],
    queryFn: () => api.get<{ payment: Payment }>(`/payments/${id}`),
    enabled: !!id,
  });
}

export interface RecordPaymentInput {
  requestId: string;
  description?: string;
  paidName?: string;
  paidRef?: string;
  paidAmount: number;
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => api.post<{ payment: Payment }>("/payments", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}
