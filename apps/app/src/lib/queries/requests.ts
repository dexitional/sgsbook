import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";
import type { BookingRequest, Paginated, RequestStatus } from "../admin-types.js";

export interface RequestsQuery {
  status?: RequestStatus;
  clientId?: string;
  page: number;
  pageSize: number;
}

export function useRequests(query: RequestsQuery) {
  return useQuery({
    queryKey: ["requests", query],
    queryFn: () => api.get<Paginated<BookingRequest>>("/requests", query),
    placeholderData: (prev) => prev,
  });
}

export function useRequest(id: string | null) {
  return useQuery({
    queryKey: ["requests", id],
    queryFn: () => api.get<{ request: BookingRequest }>(`/requests/${id}`),
    enabled: !!id,
  });
}

export interface CreateRequestInput {
  clientId: string;
  title: string;
  description?: string;
  packages: Array<{ itemId: string; bookStart: string; bookEnd: string; addonItemIds?: string[] }>;
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequestInput) => api.post<{ request: BookingRequest }>("/requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    // `reason` is required by the API when status is REJECTED — it's sent to
    // the customer by email and SMS.
    mutationFn: ({ id, status, reason }: { id: string; status: RequestStatus; reason?: string }) =>
      api.patch<{ request: BookingRequest }>(`/requests/${id}/status`, { status, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export interface RescheduleRequestInput {
  id: string;
  reason: string;
  packages: Array<{ packageId: string; bookStart: string; bookEnd: string }>;
}

// Reschedule: new period, re-priced on that period only.
export function useRescheduleRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: RescheduleRequestInput) =>
      api.patch<{ request: BookingRequest }>(`/requests/${id}/schedule`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export interface ExtendRequestInput {
  id: string;
  reason: string;
  packages: Array<{ packageId: string; bookEnd: string }>;
}

// Extension: start stays, end moves later, extra days added as a balance.
export function useExtendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ExtendRequestInput) =>
      api.patch<{ request: BookingRequest }>(`/requests/${id}/extend`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });
}
