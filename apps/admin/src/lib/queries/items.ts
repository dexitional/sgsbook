import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";
import type { Item, ItemType, Paginated } from "../types.js";

export interface ItemsQuery {
  itemType?: ItemType;
  search?: string;
  page: number;
  pageSize: number;
}

export function useItems(query: ItemsQuery) {
  return useQuery({
    queryKey: ["items", query],
    queryFn: () => api.get<Paginated<Item>>("/items", query),
    placeholderData: (prev) => prev,
  });
}

export interface CreateItemInput {
  title: string;
  description?: string;
  imageUrl?: string;
  amount?: number;
  intamount?: number;
  extamount?: number;
  itemType: ItemType;
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateItemInput) => api.post<{ item: Item }>("/items", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateItemInput> & { id: string; status?: boolean }) =>
      api.patch<{ item: Item }>(`/items/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}
