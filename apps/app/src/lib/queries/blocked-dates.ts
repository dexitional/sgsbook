import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";
import type { BlockAffectedBooking, BlockedDate, Paginated } from "../admin-types.js";

export interface BlockedDatesQuery {
  includePast?: boolean;
  page: number;
  pageSize: number;
}

export function useBlockedDates(query: BlockedDatesQuery) {
  return useQuery({
    queryKey: ["blocked-dates", query],
    queryFn: () => api.get<Paginated<BlockedDate>>("/blocked-dates", query),
    placeholderData: (prev) => prev,
  });
}

export interface CreateBlockedDateInput {
  itemId: string | null;
  blockStart: string;
  blockEnd: string;
  reason: string;
}

export function useCreateBlockedDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlockedDateInput) =>
      api.post<{ blockedDate: BlockedDate; affected: BlockAffectedBooking[] }>("/blocked-dates", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked-dates"] }),
  });
}

export function useDeleteBlockedDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/blocked-dates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked-dates"] }),
  });
}
