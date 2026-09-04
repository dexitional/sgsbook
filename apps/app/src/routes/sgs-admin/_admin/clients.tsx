import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { DataTable } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { GlassChip } from "#/components/glass-chip";
import { useClients, useCreateClient } from "#/lib/queries/clients";
import { ImageUploadField } from "#/components/image-upload-field";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import type { Client } from "#/lib/admin-types";

export const Route = createFileRoute("/sgs-admin/_admin/clients")({ component: ClientsPage });

const columnHelper = createColumnHelper<Client>();
const columns = [
  columnHelper.display({
    id: "avatar",
    header: "",
    cell: (c) => (
      <Avatar className="size-8">
        <AvatarImage src={c.row.original.imageUrl ?? undefined} />
        <AvatarFallback className="text-xs">{c.row.original.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
    ),
  }),
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("organisation", { header: "Organisation", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor("type", {
    header: "Type",
    cell: (c) => (
      <GlassChip color={c.getValue() === "EXTERNAL" ? "var(--accent)" : "var(--primary)"}>{c.getValue()}</GlassChip>
    ),
  }),
  columnHelper.accessor((row) => row.contacts.find((c) => c.isPrimary) ?? row.contacts[0], {
    id: "contact",
    header: "Primary contact",
    cell: (c) => {
      const contact = c.getValue();
      return contact ? `${contact.name}${contact.phone ? ` · ${contact.phone}` : ""}` : "—";
    },
  }),
  columnHelper.accessor((row) => row._count?.UbsRequest ?? 0, {
    id: "requests",
    header: "Requests",
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (c) => format(new Date(c.getValue()), "PP"),
  }),
];

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const clients = useClients({ search: search || undefined, page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Organisations and individuals who book facilities.</p>
        </div>
        <CreateClientDialog />
      </div>

      <DataTable
        columns={columns}
        data={clients.data?.items ?? []}
        isLoading={clients.isFetching}
        rowCount={clients.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        searchPlaceholder="Search clients…"
        emptyMessage="No clients yet."
      />
    </div>
  );
}

const createClientSchema = z.object({
  name: z.string().min(1, "Required"),
  organisation: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  imageUrl: z.string().optional(),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

function CreateClientDialog() {
  const [open, setOpen] = useState(false);
  const createClient = useCreateClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(createClientSchema), defaultValues: { type: "EXTERNAL" as const } });

  const onSubmit = handleSubmit((values) => {
    createClient.mutate(
      {
        name: values.name,
        organisation: values.organisation || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        imageUrl: values.imageUrl,
        type: values.type,
        contacts: values.contactName
          ? [{ name: values.contactName, phone: values.contactPhone || undefined, isPrimary: true }]
          : undefined,
      },
      { onSuccess: () => { setOpen(false); reset(); } },
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organisation">Organisation</Label>
              <Input id="organisation" {...register("organisation")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <ImageUploadField
            label="Photo"
            folder="clients"
            value={watch("imageUrl")}
            onChange={(url) => setValue("imageUrl", url)}
          />
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={watch("type")} onValueChange={(v) => setValue("type", v as "INTERNAL" | "EXTERNAL")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="EXTERNAL">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Contact person</Label>
              <Input id="contactName" {...register("contactName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input id="contactPhone" {...register("contactPhone")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? "Creating…" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
