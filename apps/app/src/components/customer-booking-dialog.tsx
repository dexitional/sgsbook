import { useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Trash2 } from "lucide-react";
import { computeRequestInvoice } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Checkbox } from "#/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { createBookingRequest, getBookableItems } from "#/server/customer";
import { toDateTimeLocal, type BookingIntent } from "#/lib/booking-intent";

interface BookableItem {
  id: string;
  title: string;
  itemType: "FACILITY" | "ADDON";
  amount: number | null;
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

function packageFromIntent(intent?: BookingIntent | null) {
  return {
    ...emptyPackage,
    itemId: intent?.itemId ?? "",
    bookStart: intent?.bookStart ? toDateTimeLocal(intent.bookStart) : "",
    bookEnd: intent?.bookEnd ? toDateTimeLocal(intent.bookEnd) : "",
  };
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
  control: Control<NewRequestForm>;
  register: UseFormRegister<NewRequestForm>;
  setValue: UseFormSetValue<NewRequestForm>;
  errors: FieldErrors<NewRequestForm>;
  facilities: BookableItem[];
  addons: BookableItem[];
  onRemove?: () => void;
}) {
  const addonItemIds = useWatch({ control, name: `packages.${index}.addonItemIds` }) ?? [];
  // Controlled so a facility prefilled from the calendar actually shows.
  const itemId = useWatch({ control, name: `packages.${index}.itemId` }) ?? "";

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Package {index + 1}</p>
        {onRemove && (
          <Button type="button" size="icon" variant="ghost" aria-label="Remove package" onClick={onRemove}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Facility</Label>
        <Select value={itemId} onValueChange={(v) => setValue(`packages.${index}.itemId`, v, { shouldValidate: true })}>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      <p className="text-xs text-muted-foreground">
        Once approved, you'll have 24 hours to pay or the request is declined automatically.
      </p>
    </div>
  );
}

// The customer's booking-request form. Used both from the Bookings page
// ("New request") and as the quick-booking dialog that opens on sign-in /
// after clicking a day on the public calendar (`initial` prefills the first
// package's facility and dates in that case).
export function CustomerBookingDialog({
  open,
  onOpenChange,
  initial,
  heading = "New booking request",
  intro,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: BookingIntent | null;
  heading?: string;
  intro?: ReactNode;
  trigger?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const items = useQuery({ queryKey: ["bookable-items"], queryFn: () => getBookableItems(), enabled: open });
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

  // Re-seed whenever a prefill arrives (calendar click → sign-in → here).
  useEffect(() => {
    if (open && initial) reset({ title: "", packages: [packageFromIntent(initial)] });
  }, [open, initial, reset]);

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
      // most commonly this is the availability check rejecting an
      // already-booked or blocked period.
      toast.error(err instanceof Error ? err.message : "Couldn't submit booking request");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
    onOpenChange(false);
    reset({ title: "", packages: [emptyPackage] });
    toast.success("Booking request submitted");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          {intro && <DialogDescription asChild><div>{intro}</div></DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="booking-title">What's this for?</Label>
            <Input id="booking-title" placeholder="e.g. Departmental workshop" {...register("title")} />
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
