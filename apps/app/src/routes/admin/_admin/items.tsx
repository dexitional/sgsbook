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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
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
import { Textarea } from "#/components/ui/textarea";
import { Badge } from "#/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { ApiError } from "#/lib/api-client";
import { useCreateItem, useDeleteItem, useItems, useUpdateItem } from "#/lib/queries/items";
import { ImageUploadField } from "#/components/image-upload-field";
import { GlassChip } from "#/components/glass-chip";
import type { Item, ItemType } from "#/lib/admin-types";

export const Route = createFileRoute("/admin/_admin/items")({ component: ItemsPage });

const columnHelper = createColumnHelper<Item>();
const columns = [
  columnHelper.display({
    id: "image",
    header: "",
    cell: (c) =>
      c.row.original.imageUrl ? (
        <img src={c.row.original.imageUrl} alt="" className="size-10 rounded-md object-cover" />
      ) : (
        <div className="size-10 rounded-md bg-muted" />
      ),
  }),
  columnHelper.accessor("title", { header: "Title" }),
  columnHelper.accessor("itemType", {
    header: "Type",
    cell: (c) => (
      <GlassChip color={c.getValue() === "FACILITY" ? "var(--primary)" : "var(--accent)"}>{c.getValue()}</GlassChip>
    ),
  }),
  columnHelper.accessor("amount", {
    header: "Unit price / day",
    cell: (c) => (c.getValue() != null ? `GHS ${c.getValue()!.toLocaleString()}` : "—"),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (c) => <Badge variant={c.getValue() ? "outline" : "destructive"}>{c.getValue() ? "Active" : "Disabled"}</Badge>,
  }),
];

function ItemsPage() {
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const items = useItems({ search: search || undefined, page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const updateItem = useUpdateItem();

  const columnsWithActions = [
    ...columns,
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="status-btn"
            onClick={() => updateItem.mutate({ id: c.row.original.id, status: !c.row.original.status })}
          >
            {c.row.original.status ? "Disable" : "Enable"}
          </Button>
          <ItemFormDialog item={c.row.original} />
          <DeleteItemAlertDialog item={c.row.original} />
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Items & Facilities</h1>
          <p className="text-sm text-muted-foreground">Bookable facilities and add-ons.</p>
        </div>
        <ItemFormDialog />
      </div>

      <DataTable
        columns={columnsWithActions}
        data={items.data?.items ?? []}
        isLoading={items.isFetching}
        rowCount={items.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        searchPlaceholder="Search items…"
        emptyMessage="No items yet."
      />
    </div>
  );
}

const itemFormSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  itemType: z.enum(["FACILITY", "ADDON"]),
});

function ItemFormDialog({ item }: { item?: Item }) {
  const isEdit = !!item;
  const [open, setOpen] = useState(false);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemFormSchema),
    defaultValues: item
      ? {
          title: item.title,
          description: item.description ?? undefined,
          imageUrl: item.imageUrl ?? undefined,
          amount: item.amount ?? undefined,
          itemType: item.itemType,
        }
      : { itemType: "FACILITY" as ItemType },
  });

  const pending = createItem.isPending || updateItem.isPending;

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateItem.mutate(
        { id: item.id, ...values },
        {
          onSuccess: () => {
            setOpen(false);
            toast.success("Item updated");
          },
        },
      );
    } else {
      createItem.mutate(values, {
        onSuccess: () => {
          setOpen(false);
          reset({ itemType: "FACILITY" });
          toast.success("Item created");
        },
      });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && item) {
          reset({
            title: item.title,
            description: item.description ?? undefined,
            imageUrl: item.imageUrl ?? undefined,
            amount: item.amount ?? undefined,
            itemType: item.itemType,
          });
        }
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <IconButton aria-label="Edit item" variant="ghost" size="sm">
            <Pencil className="size-4" />
          </IconButton>
        ) : (
          <Button>
            <Plus />
            New item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <ImageUploadField
            label="Photo"
            folder="facilities"
            value={watch("imageUrl")}
            onChange={(url) => setValue("imageUrl", url)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Unit price / day (GHS)</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={watch("itemType")} onValueChange={(v) => setValue("itemType", v as ItemType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACILITY">Facility</SelectItem>
                  <SelectItem value="ADDON">Add-on</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteItemAlertDialog({ item }: { item: Item }) {
  const deleteItem = useDeleteItem();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconButton aria-label="Delete item" variant="ghost" size="sm">
          <Trash2 className="size-4 text-destructive" />
        </IconButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{item.title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This can't be undone. Items already used in a booking request can't be deleted — disable them instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              deleteItem.mutate(item.id, {
                onSuccess: () => toast.success("Item deleted"),
                onError: (err) => {
                  toast.error(err instanceof ApiError ? err.message : "Couldn't delete item");
                },
              });
            }}
            disabled={deleteItem.isPending}
          >
            {deleteItem.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
