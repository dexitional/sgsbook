import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";
import type { Paginated, Role, UserAccount } from "../types.js";

export interface UsersQuery {
  search?: string;
  page: number;
  pageSize: number;
}

export function useUsers(query: UsersQuery) {
  return useQuery({
    queryKey: ["users", query],
    queryFn: () => api.get<Paginated<UserAccount>>("/users", query),
    placeholderData: (prev) => prev,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<{ roles: Role[] }>("/users/roles"),
  });
}

export interface CreateUserInput {
  tag: string;
  username: string;
  name?: string;
  password: string;
  appRoleIds: number[];
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<{ user: UserAccount }>("/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export interface UpdateUserInput {
  id: number;
  username?: string;
  name?: string;
  password?: string;
  status?: boolean;
  locked?: boolean;
  appRoleIds?: number[];
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput) => api.patch<{ user: UserAccount }>(`/users/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export interface CreateRoleInput {
  title: string;
  description?: string;
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => api.post<{ role: Role }>("/users/roles", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}
