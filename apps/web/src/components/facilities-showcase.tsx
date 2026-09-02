import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Building, MapPin } from "lucide-react";
import { Skeleton } from "#/components/ui/skeleton";
import { fetchPublicFacilities } from "#/lib/public-api";

function PriceBadge({ amount }: { amount: number }) {
  return (
    <span className="price-badge">
      <i className="price-badge__ping" aria-hidden />
      <span>GHS</span>
      <span>{amount.toLocaleString()}</span>
    </span>
  );
}

export function FacilitiesShowcase() {
  const { data, isLoading } = useQuery({ queryKey: ["public-facilities"], queryFn: fetchPublicFacilities });
  const facilities = data ?? [];

  return (
    <section id="facilities" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <div className="mb-8 max-w-xl">
        <p className="island-kicker text-xs font-semibold tracking-widest text-primary">Facilities</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-3xl">Spaces ready when you are</h2>
        <p className="mt-2 text-muted-foreground">
          Halls, labs, and event spaces across campus — see what's available before you request.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : facilities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No facilities published yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[13rem]">
          {facilities.map((facility, i) => {
            // A feature tile only reads as intentional once there's enough
            // other content around it — with 1-2 facilities it just looks
            // like broken empty space, so require a minimum grid size.
            const isFeature = i === 0 && facilities.length >= 3;
            const hasImage = Boolean(facility.imageUrl);
            return (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
                className={`group relative overflow-hidden rounded-xl border border-border bg-card transition-transform hover:-translate-y-0.5 ${
                  hasImage ? "aspect-4/3 sm:aspect-16/10 lg:aspect-auto" : "p-5"
                } ${isFeature ? "sm:col-span-2 lg:row-span-2" : ""}`}
              >
                {hasImage ? (
                  <>
                    <img
                      src={facility.imageUrl!}
                      alt=""
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="relative flex h-full flex-col justify-end p-5 text-white">
                      <h3 className="font-semibold">{facility.title}</h3>
                      {facility.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-white/80">{facility.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1 text-white/70">
                          <MapPin className="size-3.5" />
                          On campus
                        </span>
                        {facility.amount != null && <PriceBadge amount={facility.amount} />}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(320px circle at var(--x,50%) var(--y,50%), color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
                      }}
                    />
                    {isFeature && (
                      <Building
                        aria-hidden
                        className="pointer-events-none absolute -bottom-8 -right-8 size-48 text-primary/[0.06]"
                      />
                    )}
                    <div className="relative flex h-full flex-col justify-between">
                      <div>
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building className="size-4.5" />
                        </div>
                        <h3 className="mt-3 font-semibold">{facility.title}</h3>
                        {facility.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{facility.description}</p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3.5" />
                          On campus
                        </span>
                        {facility.amount != null && <PriceBadge amount={facility.amount} />}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
