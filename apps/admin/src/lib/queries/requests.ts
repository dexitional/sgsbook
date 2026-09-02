import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";
import type { BookingRequest, Paginated, RequestStatus } from "../types.js";

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
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      api.patch<{ request: BookingRequest }>(`/requests/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });
}
