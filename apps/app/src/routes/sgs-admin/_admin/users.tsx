import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, IconButton } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { GlassChip } from "#/components/glass-chip";
import { ApiError } from "#/lib/api-client";
import { useCreateRole, useCreateUser, useDeleteUser, useRoles, useUpdateUser, useUsers } from "#/lib/queries/users";
import { useAdminSession } from "#/lib/queries/session";
import type { UserAccount } from "#/lib/admin-types";

export const Route = createFileRoute("/sgs-admin/_admin/users")({ component: UsersPage });

const columnHelper = createColumnHelper<UserAccount>();

// Roles are admin-created (no fixed set), so alternate between the app's
// primary/accent theme colors by role id — each role keeps a stable color
// without hardcoding a per-title mapping.
function roleColor(roleId: number) {
  return roleId % 2 === 0 ? "var(--primary)" : "var(--accent)";
}

function UsersPage() {
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const users = useUsers({ search: search || undefined, page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const updateUser = useUpdateUser();
  const session = useAdminSession();
  const currentUserId = session.data?.user.id;

  const columns = [
    columnHelper.accessor("tag", { header: "Tag" }),
    columnHelper.accessor("name", { header: "Name", cell: (c) => c.getValue() ?? "—" }),
    columnHelper.accessor("username", { header: "Username" }),
    columnHelper.display({
      id: "roles",
      header: "Roles",
      cell: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.row.original.roles.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            c.row.original.roles.map((r) => (
              <GlassChip key={r.id} color={roleColor(r.id)}>
                {r.title}
              </GlassChip>
            ))
          )}
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (c) => <Badge variant={c.getValue() ? "outline" : "destructive"}>{c.getValue() ? "Active" : "Disabled"}</Badge>,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (c) => {
        const row = c.row.original;
        const isSelf = row.id === currentUserId;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="status-btn"
              disabled={isSelf}
              title={isSelf ? "You can't disable your own account" : undefined}
              onClick={() => updateUser.mutate({ id: row.id, status: !row.status })}
            >
              {row.status ? "Disable" : "Enable"}
            </Button>
            <UserFormDialog user={row} />
            <DeleteUserAlertDialog user={row} disabled={isSelf} />
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Staff accounts that can sign in to this admin portal.</p>
        </div>
        <UserFormDialog />
      </div>

      <DataTable
        columns={columns}
        data={users.data?.items ?? []}
        isLoading={users.isFetching}
        rowCount={users.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        searchPlaceholder="Search users…"
        emptyMessage="No users yet."
      />
    </div>
  );
}

function userFormSchema(isEdit: boolean) {
  return z.object({
    tag: z.string().min(1, "Required"),
    username: z.string().min(1, "Required"),
    name: z.string().optional(),
    password: isEdit
      ? z.union([z.string().min(8, "At least 8 characters"), z.literal("")])
      : z.string().min(8, "At least 8 characters"),
    appRoleIds: z.array(z.number()).min(1, "Select at least one role"),
  });
}

function UserFormDialog({ user }: { user?: UserAccount }) {
  const isEdit = !!user;
  const [open, setOpen] = useState(false);
  const roles = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userFormSchema(isEdit)),
    defaultValues: user
      ? {
          tag: user.tag,
          username: user.username,
          name: user.name ?? "",
          password: "",
          appRoleIds: user.roles.map((r) => r.id),
        }
      : { tag: "", username: "", name: "", password: "", appRoleIds: [] as number[] },
  });

  const pending = createUser.isPending || updateUser.isPending;
  const appRoleIds = watch("appRoleIds") ?? [];

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateUser.mutate(
        {
          id: user.id,
          username: values.username,
          name: values.name ? values.name : undefined,
          password: values.password ? values.password : undefined,
          appRoleIds: values.appRoleIds,
        },
        {
          onSuccess: () => {
            setOpen(false);
            toast.success("User updated");
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update user"),
        },
      );
    } else {
      createUser.mutate(
        { ...values, name: values.name ? values.name : undefined },
        {
          onSuccess: () => {
            setOpen(false);
            reset({ tag: "", username: "", name: "", password: "", appRoleIds: [] });
            toast.success("User created");
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't create user"),
        },
      );
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && user) {
          reset({
            tag: user.tag,
            username: user.username,
            name: user.name ?? "",
            password: "",
            appRoleIds: user.roles.map((r) => r.id),
          });
        }
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <IconButton aria-label="Edit user" variant="ghost" size="sm">
            <Pencil className="size-4" />
          </IconButton>
        ) : (
          <Button>
            <Plus />
            New user
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tag">Login tag</Label>
              <Input id="tag" disabled={isEdit} {...register("tag")} />
              {errors.tag && <p className="text-xs text-destructive">{errors.tag.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...register("username")} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Optional" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{isEdit ? "New password" : "Password"}</Label>
            <Input id="password" type="password" placeholder={isEdit ? "Leave blank to keep current" : undefined} {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Roles</Label>
              <NewRoleDialog />
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              {roles.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading roles…</p>
              ) : roles.data?.roles.length === 0 ? (
                <p className="text-xs text-muted-foreground">No roles yet — create one above.</p>
              ) : (
                roles.data?.roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm font-normal">
                    <Checkbox
                      checked={appRoleIds.includes(role.id)}
                      onCheckedChange={(checked) => {
                        const next = checked ? [...appRoleIds, role.id] : appRoleIds.filter((id) => id !== role.id);
                        setValue("appRoleIds", next, { shouldValidate: true });
                      }}
                    />
                    {role.title}
                  </label>
                ))
              )}
            </div>
            {errors.appRoleIds && <p className="text-xs text-destructive">{errors.appRoleIds.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const roleFormSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
});

function NewRoleDialog() {
  const [open, setOpen] = useState(false);
  const createRole = useCreateRole();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(roleFormSchema) });

  const onSubmit = handleSubmit((values) => {
    createRole.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
        toast.success("Role created");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't create role"),
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Plus className="size-3.5" />
          New role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="role-title">Title</Label>
            <Input id="role-title" placeholder="e.g. Finance" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Input id="role-description" placeholder="Optional" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createRole.isPending}>
              {createRole.isPending ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserAlertDialog({ user, disabled }: { user: UserAccount; disabled?: boolean }) {
  const deleteUser = useDeleteUser();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconButton
          aria-label="Delete user"
          variant="ghost"
          size="sm"
          disabled={disabled}
          title={disabled ? "You can't delete your own account" : undefined}
        >
          <Trash2 className="size-4 text-destructive" />
        </IconButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{user.username}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This can't be undone. They'll immediately lose access to the admin portal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              deleteUser.mutate(user.id, {
                onSuccess: () => toast.success("User deleted"),
                onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't delete user"),
              });
            }}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
