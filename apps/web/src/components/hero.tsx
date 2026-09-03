import { motion } from "motion/react";
import { CalendarCheck } from "lucide-react";
import { Button } from "#/components/ui/button";
import { StartBookingButton } from "#/components/start-booking-button";
import { asset } from "#/lib/asset";

export function Hero() {
  return (
    <section className="relative flex min-h-[54vh] items-center overflow-hidden">
      <BannerBackground />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="hero-panel relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white/10 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:p-8 md:p-12"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md"
            >
              <CalendarCheck className="size-3.5" />
              Book SGS facilities in minutes
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-balance text-2xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Seminar rooms to conference halls.
              <br />
              <span className="text-[#7fd4ff]">Reserved in clicks.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mx-auto mt-4 max-w-2xl text-balance text-sm text-white/85 sm:mt-5 sm:text-base md:text-lg"
            >
              The School of Graduate Studies provides a platform to book venues for your research, workshops, and conferences
              instantly without administrative delays. Users can check real-time
              availability to book the venue.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <StartBookingButton />
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
              >
                <a href="#facilities">Browse facilities</a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BannerBackground() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[#0b1220]">
      <motion.img
        src={asset("banner.jpg")}
        alt=""
        className="size-full object-cover"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 20, ease: "easeOut" }}
      />
      {/* Brand-tinted scrim: dark enough at the bottom for text, lighter at
          the top so the photo still reads, with a faint primary-blue wash
          for cohesion with the rest of the design system. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/95 via-[#0b1220]/55 to-[#0b1220]/25" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(120deg, color-mix(in oklab, var(--primary) 35%, transparent), transparent 55%)" }}
      />
    </div>
  );
}
