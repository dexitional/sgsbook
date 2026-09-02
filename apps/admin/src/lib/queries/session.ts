import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client.js";

export interface AdminUser {
  id: number;
  tag: string;
  username: string;
  roles: string[];
}

export function useAdminSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => api.get<{ user: AdminUser }>("/admin-auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tag: string; password: string }) =>
      api.post<{ user: AdminUser }>("/admin-auth/login", input),
    onSuccess: (data) => {
      queryClient.setQueryData(["session"], data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/admin-auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["session"], undefined);
      queryClient.clear();
    },
  });
}

export function hasRole(user: AdminUser | undefined, roles: string[]): boolean {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r));
}
