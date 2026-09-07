import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "#/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Checkbox } from "#/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { createBookingRequest, getBookableItems, getCustomerRequests } from "#/server/customer";
import type { RequestStatus } from "#/lib/customer-types";

export const Route = createFileRoute("/_customer/requests")({ component: RequestsPage });

interface BookableItem {
  id: string;
  title: string;
  itemType: "FACILITY" | "ADDON";
  amount: number | null;
}

interface RequestPackageAddon {
  id: string;
  item: { title: string; amount: number | null };
}

interface RequestPackage {
  id: string;
  bookStart: Date | string | null;
  bookEnd: Date | string | null;
  bookItem: { title: string; amount: number | null };
  UbsAddon: RequestPackageAddon[];
}

interface RequestRow {
  id: string;
  title: string;
  status: RequestStatus;
  createdAt: string | Date;
  chargeAmount: number | null;
  packages: RequestPackage[];
}

const statusVariant: Record<RequestStatus, "outline" | "default" | "destructive" | "secondary"> = {
  PENDED: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  COMPLETED: "secondary",
};

const columnHelper = createColumnHelper<RequestRow>();
const columns = [
  columnHelper.accessor("title", { header: "Request" }),
  columnHelper.accessor((row) => row.packages[0]?.bookItem.title, {
    id: "facility",
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
    cell: (c) => <Badge variant={statusVariant[c.getValue()]}>{c.getValue()}</Badge>,
  }),
  columnHelper.accessor("createdAt", { header: "Submitted", cell: (c) => format(new Date(c.getValue()), "PP") }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (c) => {
      const status = c.row.original.status;
      if (status !== "APPROVED" && status !== "COMPLETED") return null;
      return <RequestInvoiceDialog request={c.row.original} />;
    },
  }),
];

function RequestInvoiceDialog({ request }: { request: RequestRow }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="chunky-btn">
          <FileText className="size-4" />
          Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invoice — {request.title}</DialogTitle>
        </DialogHeader>
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
          <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">GHS {(request.chargeAmount ?? 0).toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <a href={`/requests/${request.id}/print`} target="_blank" rel="noreferrer">
              <Printer className="size-4" />
              Print
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestsPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const requests = useQuery({ queryKey: ["customer-requests"], queryFn: () => getCustomerRequests() });

  const allRows = (requests.data ?? []) as unknown as RequestRow[];
  const pageRows = allRows.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">Track the status of every request you've submitted.</p>
        </div>
        <NewRequestDialog />
      </div>

      <DataTable
        columns={columns}
        data={pageRows}
        isLoading={requests.isLoading}
        rowCount={allRows.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage="You haven't made any booking requests yet."
      />
    </div>
  );
}

const packageSchema = z.object({
  itemId: z.string().min(1, "Select a facility"),
  bookStart: z.string().min(1, "Required"),
  bookEnd: z.string().min(1, "Required"),
  addonItemIds: z.array(z.string()),
});

const newRequestSchema = z.object({
  title: z.string().min(1, "Required"),
  packages: z.array(packageSchema).min(1, "Add at least one package"),
});

type NewRequestForm = z.infer<typeof newRequestSchema>;

const emptyPackage = { itemId: "", bookStart: "", bookEnd: "", addonItemIds: [] as string[] };

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
  control: Control<NewRequestForm>;
  register: UseFormRegister<NewRequestForm>;
  setValue: UseFormSetValue<NewRequestForm>;
  errors: FieldErrors<NewRequestForm>;
  facilities: BookableItem[];
  addons: BookableItem[];
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
            {facilities.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.title} {f.amount != null ? `— GHS ${f.amount}/day` : ""}
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

function InvoicePreview({
  control,
  facilities,
  addons,
}: {
  control: Control<NewRequestForm>;
  facilities: BookableItem[];
  addons: BookableItem[];
}) {
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

function NewRequestDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const items = useQuery({ queryKey: ["bookable-items"], queryFn: () => getBookableItems() });
  const facilities = items.data?.filter((i) => i.itemType === "FACILITY") ?? [];
  const addons = items.data?.filter((i) => i.itemType === "ADDON") ?? [];
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewRequestForm>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: { title: "", packages: [emptyPackage] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "packages" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createBookingRequest({
        data: {
          title: values.title,
          packages: values.packages.map((pkg) => ({
            itemId: pkg.itemId,
            bookStart: new Date(pkg.bookStart).toISOString(),
            bookEnd: new Date(pkg.bookEnd).toISOString(),
            addonItemIds: pkg.addonItemIds.length > 0 ? pkg.addonItemIds : undefined,
          })),
        },
      });
    } catch (err) {
      // Leave the dialog open (with whatever the customer already entered)
      // so they can pick a different time instead of starting over —
      // most commonly this is the scheduling-conflict check rejecting an
      // already-booked period.
      toast.error(err instanceof Error ? err.message : "Couldn't submit booking request");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
    setOpen(false);
    reset({ title: "", packages: [emptyPackage] });
    toast.success("Booking request submitted");
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
            <Label htmlFor="title">What's this for?</Label>
            <Input id="title" placeholder="e.g. Departmental workshop" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
