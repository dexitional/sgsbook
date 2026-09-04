import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileText, Plus, Printer, Trash2 } from "lucide-react";
import { DataTable, computeDays, computeRequestInvoice } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Checkbox } from "#/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { GlassChip } from "#/components/glass-chip";
import { useClients } from "#/lib/queries/clients";
import { useItems } from "#/lib/queries/items";
import { useCreateRequest, useRequest, useRequests, useUpdateRequestStatus } from "#/lib/queries/requests";
import type { BookingRequest, Item, RequestStatus } from "#/lib/admin-types";

export const Route = createFileRoute("/admin/_admin/requests")({ component: RequestsPage });

// Uses only the app's primary/accent theme colors (not the chart palette) —
// accent reads as the "needs attention" state (pending/rejected), primary
// as the "on track" state (approved/completed).
const statusColor: Record<RequestStatus, string> = {
  PENDED: "var(--accent)",
  APPROVED: "var(--primary)",
  REJECTED: "var(--accent)",
  COMPLETED: "var(--primary)",
};

const columnHelper = createColumnHelper<BookingRequest>();

function RequestsPage() {
  const [status, setStatus] = useState<RequestStatus | "ALL">("ALL");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [invoiceRequestId, setInvoiceRequestId] = useState<string | null>(null);
  const requests = useRequests({
    status: status === "ALL" ? undefined : status,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });
  const updateStatus = useUpdateRequestStatus();

  const columns = [
    columnHelper.accessor("title", { header: "Title" }),
    columnHelper.accessor((row) => row.client?.name, { id: "client", header: "Client", cell: (c) => c.getValue() ?? "—" }),
    columnHelper.accessor((row) => row.packages[0]?.bookItem.title, {
      id: "item",
      header: "Facility",
      cell: (c) => {
        const count = c.row.original.packages.length;
        const value = c.getValue();
        return value ? `${value}${count > 1 ? ` +${count - 1} more` : ""}` : "—";
      },
    }),
    columnHelper.accessor((row) => row.packages[0]?.bookStart, {
      id: "when",
      header: "When",
      cell: (c) => (c.getValue() ? format(new Date(c.getValue()!), "PPp") : "—"),
    }),
    columnHelper.accessor("chargeAmount", {
      header: "Total",
      cell: (c) => (c.getValue() != null ? `GHS ${c.getValue()!.toLocaleString()}` : "—"),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (c) => <GlassChip color={statusColor[c.getValue()]}>{c.getValue()}</GlassChip>,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (c) => {
        const req = c.row.original;
        return (
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="chunky-btn" onClick={() => setInvoiceRequestId(req.id)}>
              <FileText className="size-4" />
              Invoice
            </Button>
            {req.status === "PENDED" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="status-btn"
                  onClick={() => updateStatus.mutate({ id: req.id, status: "APPROVED" })}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="status-btn"
                  onClick={() => updateStatus.mutate({ id: req.id, status: "REJECTED" })}
                >
                  Reject
                </Button>
              </>
            )}
            {req.status === "APPROVED" && (
              <Button
                size="sm"
                variant="ghost"
                className="status-btn"
                onClick={() => updateStatus.mutate({ id: req.id, status: "COMPLETED" })}
              >
                Mark completed
              </Button>
            )}
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Booking requests</h1>
          <p className="text-sm text-muted-foreground">Review, approve, and track facility bookings.</p>
        </div>
        <CreateRequestDialog />
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as RequestStatus | "ALL");
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
      >
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDED">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={requests.data?.items ?? []}
        isLoading={requests.isFetching}
        rowCount={requests.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage="No booking requests."
      />

      <RequestInvoiceDialog
        requestId={invoiceRequestId}
        open={invoiceRequestId != null}
        onOpenChange={(open) => !open && setInvoiceRequestId(null)}
      />
    </div>
  );
}

function RequestInvoiceDialog({
  requestId,
  open,
  onOpenChange,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useRequest(requestId);
  const request = data?.request;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invoice — {request?.title ?? "…"}</DialogTitle>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {request && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Client: {request.client?.name ?? "—"}</p>
            <div className="space-y-3">
              {request.packages.map((pkg) => {
                const days = pkg.bookStart && pkg.bookEnd ? computeDays(pkg.bookStart, pkg.bookEnd) : 1;
                const unitPrice = pkg.bookItem.amount ?? 0;
                const facilityTotal = unitPrice * days;
                const addonsTotal = pkg.UbsAddon.reduce((sum, a) => sum + (a.item.amount ?? 0) * days, 0);
                return (
                  <div key={pkg.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between font-medium">
                      <span>{pkg.bookItem.title}</span>
                      <span className="tabular-nums">GHS {(facilityTotal + addonsTotal).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pkg.bookStart ? format(new Date(pkg.bookStart), "PP") : "—"} –{" "}
                      {pkg.bookEnd ? format(new Date(pkg.bookEnd), "PP") : "—"} · {days} {days === 1 ? "day" : "days"}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-muted-foreground">
                      <span>Facility (GHS {unitPrice}/day)</span>
                      <span className="tabular-nums">GHS {facilityTotal.toFixed(2)}</span>
                    </div>
                    {pkg.UbsAddon.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between text-muted-foreground">
                        <span>
                          {addon.item.title} (GHS {addon.item.amount ?? 0}/day)
                        </span>
                        <span className="tabular-nums">GHS {((addon.item.amount ?? 0) * days).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">GHS {(request.chargeAmount ?? 0).toFixed(2)}</span>
            </div>
            <DialogFooter>
              <Button asChild variant="outline">
                <a href={`/admin/requests/${request.id}/print`} target="_blank" rel="noreferrer">
                  <Printer className="size-4" />
                  Print
                </a>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const packageSchema = z.object({
  itemId: z.string().min(1, "Select a facility"),
  bookStart: z.string().min(1, "Required"),
  bookEnd: z.string().min(1, "Required"),
  addonItemIds: z.array(z.string()),
});

const createRequestSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  title: z.string().min(1, "Required"),
  packages: z.array(packageSchema).min(1, "Add at least one package"),
});

type CreateRequestForm = z.infer<typeof createRequestSchema>;

const emptyPackage = { itemId: "", bookStart: "", bookEnd: "", addonItemIds: [] as string[] };

function InvoicePreview({ control, facilities, addons }: { control: Control<CreateRequestForm>; facilities: Item[]; addons: Item[] }) {
  const packages = useWatch({ control, name: "packages" });

  const invoice = computeRequestInvoice(
    (packages ?? [])
      .filter((pkg) => pkg.itemId && pkg.bookStart && pkg.bookEnd)
      .map((pkg) => {
        const facility = facilities.find((f) => f.id === pkg.itemId);
        return {
          bookStart: pkg.bookStart,
          bookEnd: pkg.bookEnd,
          facility: { id: pkg.itemId, title: facility?.title ?? "Facility", amount: facility?.amount ?? null },
          addons: (pkg.addonItemIds ?? []).map((addonId) => {
            const addon = addons.find((a) => a.id === addonId);
            return { id: addonId, title: addon?.title ?? "Addon", amount: addon?.amount ?? null };
          }),
        };
      }),
  );

  if (invoice.packages.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
      <p className="font-medium">Invoice preview</p>
      {invoice.packages.map((pkg, i) => (
        <div key={i} className="flex items-center justify-between text-muted-foreground">
          <span>
            {pkg.facilityTitle} × {pkg.days} {pkg.days === 1 ? "day" : "days"}
            {pkg.addons.length > 0 && ` + ${pkg.addons.length} addon${pkg.addons.length > 1 ? "s" : ""}`}
          </span>
          <span className="tabular-nums text-foreground">GHS {pkg.packageTotal.toFixed(2)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t pt-2 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">GHS {invoice.total.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PackageFields({
  index,
  control,
  register,
  setValue,
  errors,
  facilities,
  addons,
  onRemove,
}: {
  index: number;
  control: Control<CreateRequestForm>;
  register: UseFormRegister<CreateRequestForm>;
  setValue: UseFormSetValue<CreateRequestForm>;
  errors: FieldErrors<CreateRequestForm>;
  facilities: Item[];
  addons: Item[];
  onRemove?: () => void;
}) {
  const addonItemIds = useWatch({ control, name: `packages.${index}.addonItemIds` }) ?? [];

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Package {index + 1}</p>
        {onRemove && (
          <Button type="button" size="icon" variant="ghost" onClick={onRemove}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Facility</Label>
        <Select onValueChange={(v) => setValue(`packages.${index}.itemId`, v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a facility" />
          </SelectTrigger>
          <SelectContent>
            {facilities.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.title} {i.amount != null ? `— GHS ${i.amount}/day` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.packages?.[index]?.itemId && (
          <p className="text-xs text-destructive">{errors.packages[index]?.itemId?.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start</Label>
          <Input type="datetime-local" {...register(`packages.${index}.bookStart`)} />
          {errors.packages?.[index]?.bookStart && (
            <p className="text-xs text-destructive">{errors.packages[index]?.bookStart?.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>End</Label>
          <Input type="datetime-local" {...register(`packages.${index}.bookEnd`)} />
          {errors.packages?.[index]?.bookEnd && (
            <p className="text-xs text-destructive">{errors.packages[index]?.bookEnd?.message}</p>
          )}
        </div>
      </div>
      {addons.length > 0 && (
        <div className="space-y-1.5">
          <Label>Addons</Label>
          <div className="grid grid-cols-2 gap-2">
            {addons.map((addon) => (
              <label key={addon.id} className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={addonItemIds.includes(addon.id)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...addonItemIds, addon.id]
                      : addonItemIds.filter((id) => id !== addon.id);
                    setValue(`packages.${index}.addonItemIds`, next);
                  }}
                />
                {addon.title} {addon.amount != null ? `(GHS ${addon.amount}/day)` : ""}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateRequestDialog() {
  const [open, setOpen] = useState(false);
  const clients = useClients({ page: 1, pageSize: 100 });
  const allItems = useItems({ page: 1, pageSize: 100 });
  const facilities = allItems.data?.items.filter((i) => i.itemType === "FACILITY") ?? [];
  const addons = allItems.data?.items.filter((i) => i.itemType === "ADDON") ?? [];
  const createRequest = useCreateRequest();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateRequestForm>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: { clientId: "", title: "", packages: [emptyPackage] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "packages" });

  const onSubmit = handleSubmit((values) => {
    createRequest.mutate(
      {
        clientId: values.clientId,
        title: values.title,
        packages: values.packages.map((pkg) => ({
          itemId: pkg.itemId,
          bookStart: new Date(pkg.bookStart).toISOString(),
          bookEnd: new Date(pkg.bookEnd).toISOString(),
          addonItemIds: pkg.addonItemIds.length > 0 ? pkg.addonItemIds : undefined,
        })),
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset({ clientId: "", title: "", packages: [emptyPackage] });
          toast.success("Booking request created");
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New booking request</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select onValueChange={(v) => setValue("clientId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.data?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <PackageFields
                key={field.id}
                index={index}
                control={control}
                register={register}
                setValue={setValue}
                errors={errors}
                facilities={facilities}
                addons={addons}
                onRemove={fields.length > 1 ? () => remove(index) : undefined}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyPackage)}>
              <Plus className="size-4" />
              Add package
            </Button>
            {errors.packages?.root && <p className="text-xs text-destructive">{errors.packages.root.message}</p>}
          </div>

          <InvoicePreview control={control} facilities={facilities} addons={addons} />

          <DialogFooter>
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending ? "Creating…" : "Create request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
