import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarOff, TriangleAlert, Trash2 } from "lucide-react";
import { DataTable, IconButton } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { GlassChip } from "#/components/glass-chip";
import { ApiError } from "#/lib/api-client";
import { useItems } from "#/lib/queries/items";
import { useBlockedDates, useCreateBlockedDate, useDeleteBlockedDate } from "#/lib/queries/blocked-dates";
import type { BlockAffectedBooking, BlockedDate } from "#/lib/admin-types";

export const Route = createFileRoute("/admin/_admin/blocked-dates")({ component: BlockedDatesPage });

// Select can't hold an empty-string value, so "every facility" gets a
// sentinel that's mapped back to itemId: null on submit.
const ALL_FACILITIES = "__all__";

const columnHelper = createColumnHelper<BlockedDate>();
const columns = [
  columnHelper.accessor((row) => row.item?.title, {
    id: "facility",
    header: "Facility",
    cell: (c) =>
      c.getValue() ?? <GlassChip color="var(--destructive)">All facilities</GlassChip>,
  }),
  columnHelper.accessor("blockStart", { header: "From", cell: (c) => format(new Date(c.getValue()), "PPp") }),
  columnHelper.accessor("blockEnd", { header: "To", cell: (c) => format(new Date(c.getValue()), "PPp") }),
  columnHelper.accessor("reason", {
    header: "Reason",
    cell: (c) => <span className="line-clamp-2 max-w-xs">{c.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.creator?.username, {
    id: "creator",
    header: "Blocked by",
    cell: (c) => c.getValue() ?? "—",
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (c) => <DeleteBlockedDateButton blockedDate={c.row.original} />,
  }),
];

function BlockedDatesPage() {
  const [includePast, setIncludePast] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [affected, setAffected] = useState<BlockAffectedBooking[]>([]);
  const blocked = useBlockedDates({ includePast, page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blocked dates</h1>
          <p className="text-sm text-muted-foreground">
            Take a facility out of booking for emergencies or maintenance. Blocked windows show on the public calendar.
          </p>
        </div>
        <BlockDatesDialog onAffected={setAffected} />
      </div>

      <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={includePast}
          onCheckedChange={(checked) => {
            setIncludePast(checked === true);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />
        Show past blocks
      </label>

      <DataTable
        columns={columns}
        data={blocked.data?.items ?? []}
        isLoading={blocked.isFetching}
        rowCount={blocked.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage="No blocked dates. Every facility is open for booking."
      />

      <AffectedBookingsDialog affected={affected} onClose={() => setAffected([])} />
    </div>
  );
}

const blockSchema = z
  .object({
    itemId: z.string().min(1, "Choose a facility or “All facilities”"),
    blockStart: z.string().min(1, "Required"),
    blockEnd: z.string().min(1, "Required"),
    reason: z.string().trim().min(1, "Required").max(255),
  })
  .refine((v) => !v.blockStart || !v.blockEnd || new Date(v.blockEnd) > new Date(v.blockStart), {
    message: "End must be after start",
    path: ["blockEnd"],
  });

type BlockForm = z.infer<typeof blockSchema>;

const emptyForm: BlockForm = { itemId: "", blockStart: "", blockEnd: "", reason: "" };

function BlockDatesDialog({ onAffected }: { onAffected: (affected: BlockAffectedBooking[]) => void }) {
  const [open, setOpen] = useState(false);
  const facilities = useItems({ itemType: "FACILITY", page: 1, pageSize: 100 });
  const createBlockedDate = useCreateBlockedDate();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlockForm>({ resolver: zodResolver(blockSchema), defaultValues: emptyForm });
  const itemId = watch("itemId");

  const onSubmit = handleSubmit((values) => {
    createBlockedDate.mutate(
      {
        itemId: values.itemId === ALL_FACILITIES ? null : values.itemId,
        blockStart: new Date(values.blockStart).toISOString(),
        blockEnd: new Date(values.blockEnd).toISOString(),
        reason: values.reason,
      },
      {
        onSuccess: (result) => {
          setOpen(false);
          reset(emptyForm);
          toast.success("Dates blocked");
          if (result.affected.length > 0) onAffected(result.affected);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't block dates"),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarOff />
          Block dates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Block dates</DialogTitle>
          <DialogDescription>
            No one can request, approve, or reschedule into this window. Existing bookings aren't changed
            automatically. You'll see any that overlap next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Facility</Label>
            <Select value={itemId} onValueChange={(v) => setValue("itemId", v, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FACILITIES}>All facilities</SelectItem>
                {facilities.data?.items.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.itemId && <p className="text-xs text-destructive">{errors.itemId.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="block-start">From</Label>
              <Input id="block-start" type="datetime-local" {...register("blockStart")} />
              {errors.blockStart && <p className="text-xs text-destructive">{errors.blockStart.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-end">To</Label>
              <Input id="block-end" type="datetime-local" {...register("blockEnd")} />
              {errors.blockEnd && <p className="text-xs text-destructive">{errors.blockEnd.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-reason">Reason (shown publicly)</Label>
            <Input id="block-reason" placeholder="e.g. Emergency electrical repairs" {...register("reason")} />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createBlockedDate.isPending}>
              {createBlockedDate.isPending ? "Blocking…" : "Block dates"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AffectedBookingsDialog({ affected, onClose }: { affected: BlockAffectedBooking[]; onClose: () => void }) {
  return (
    <Dialog open={affected.length > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4.5 text-destructive" />
            {affected.length} booking{affected.length === 1 ? "" : "s"} overlap this block
          </DialogTitle>
          <DialogDescription>
            These are still active. Reschedule or reject each one from Bookings so the customer is notified with a
            reason.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {affected.map((b, i) => (
            <li key={`${b.requestId}-${i}`} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{b.title}</span>
                <span className="text-xs text-muted-foreground">{b.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {b.itemTitle} · {b.clientName ?? "No client"} ·{" "}
                {b.bookStart ? format(new Date(b.bookStart), "PPp") : "—"} –{" "}
                {b.bookEnd ? format(new Date(b.bookEnd), "PPp") : "—"}
              </p>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button asChild>
            <Link to="/admin/requests" onClick={onClose}>
              Go to Bookings
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBlockedDateButton({ blockedDate }: { blockedDate: BlockedDate }) {
  const deleteBlockedDate = useDeleteBlockedDate();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconButton aria-label="Remove block" variant="ghost">
          <Trash2 />
        </IconButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this block?</AlertDialogTitle>
          <AlertDialogDescription>
            {blockedDate.item?.title ?? "All facilities"} will be bookable again from{" "}
            {format(new Date(blockedDate.blockStart), "PPp")} to {format(new Date(blockedDate.blockEnd), "PPp")}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              deleteBlockedDate.mutate(blockedDate.id, {
                onSuccess: () => toast.success("Block removed"),
                onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't remove block"),
              })
            }
          >
            Remove block
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
