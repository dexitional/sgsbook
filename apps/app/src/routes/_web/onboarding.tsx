import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { getCurrentCustomer, completeOnboarding } from "#/server/customer";

export const Route = createFileRoute("/_web/onboarding")({ component: OnboardingPage });

const schema = z.object({
  organisation: z.string().optional(),
  phone: z.string().optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1, "Required"),
        phone: z.string().optional(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .min(1),
});

function OnboardingPage() {
  const navigate = useNavigate();
  const customer = useQuery({ queryKey: ["customer"], queryFn: () => getCurrentCustomer() });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { contacts: [{ name: "", phone: "", isPrimary: true }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "contacts" });

  useEffect(() => {
    if (!customer.data) return;
    if (!customer.data.authenticated) {
      navigate({ to: "/signin" });
      return;
    }
    if (customer.data.client && customer.data.client.contacts.length > 0) {
      navigate({ to: "/dashboard" });
    }
  }, [customer.data, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    await completeOnboarding({ data: values });
    navigate({ to: "/dashboard" });
  });

  const alreadyOnboarded = Boolean(customer.data?.client && customer.data.client.contacts.length > 0);

  // Mirrors the useEffect's redirect conditions exactly — otherwise this
  // form flashes on screen for one frame before the effect navigates an
  // already-onboarded customer away to /dashboard.
  if (customer.isLoading || !customer.data?.authenticated || alreadyOnboarded) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg shadow-black/5">
        <div>
          <h1 className="text-xl font-semibold">A few more details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us who's booking so our team can reach you about your requests.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="organisation">Organisation (optional)</Label>
              <Input id="organisation" {...register("organisation")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Contact person(s)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ name: "", phone: "", isPrimary: false })}
              >
                <Plus className="size-3.5" />
                Add another
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input {...register(`contacts.${index}.name` as const)} />
                  {errors.contacts?.[index]?.name && (
                    <p className="text-xs text-destructive">{errors.contacts[index]?.name?.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input {...register(`contacts.${index}.phone` as const)} />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove contact"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Continue to dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
