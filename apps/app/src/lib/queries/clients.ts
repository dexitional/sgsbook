import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";
import type { Client, Paginated } from "../admin-types.js";

export interface ClientsQuery {
  search?: string;
  type?: "INTERNAL" | "EXTERNAL";
  page: number;
  pageSize: number;
}

export function useClients(query: ClientsQuery) {
  return useQuery({
    queryKey: ["clients", query],
    queryFn: () => api.get<Paginated<Client>>("/clients", query),
    placeholderData: (prev) => prev,
  });
}

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  organisation?: string;
  imageUrl?: string;
  type: "INTERNAL" | "EXTERNAL";
  contacts?: Array<{ name: string; phone?: string; isPrimary?: boolean }>;
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<{ client: Client }>("/clients", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}
