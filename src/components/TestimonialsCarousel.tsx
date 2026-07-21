import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

export interface TestimonialItem {
  name: string;
  role: string;
  quote: string;
  stars: number;
  photoUrl: string;
  gender: "f" | "m";
  photoId: number;
}

interface Props {
  testimonials: readonly TestimonialItem[] | TestimonialItem[];
  reducedMotion?: boolean;
  perPage?: number;
  intervalMs?: number;
}

export function TestimonialsCarousel({
  testimonials,
  reducedMotion = false,
  perPage,
  intervalMs = 5000,
}: Props) {
  const [pp, setPp] = useState<number>(perPage ?? 3);

  useEffect(() => {
    if (perPage) return;
    const compute = () => {
      const w = window.innerWidth;
      setPp(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [perPage]);

  const pages = Math.max(1, Math.ceil(testimonials.length / pp));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => { if (page >= pages) setPage(0); }, [pages, page]);

  useEffect(() => {
    if (reducedMotion || paused || pages <= 1) return;
    timer.current = window.setInterval(() => {
      setPage(p => (p + 1) % pages);
    }, intervalMs);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [reducedMotion, paused, pages, intervalMs]);

  const go = (dir: -1 | 1) => setPage(p => (p + dir + pages) % pages);

  return (
    <div
      className="mt-8 relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ width: `${pages * 100}%`, transform: `translateX(-${page * (100 / pages)}%)` }}
        >
          {Array.from({ length: pages }).map((_, gi) => {
            const chunk = testimonials.slice(gi * pp, gi * pp + pp);
            return (
              <div key={gi} className="flex-none" style={{ width: `${100 / pages}%` }}>
                <div
                  className="grid gap-6 p-6"
                  style={{ gridTemplateColumns: `repeat(${pp}, minmax(0, 1fr))` }}
                >
                  {chunk.map(t => (
                    <Card key={`${t.name}-${t.photoId}`} className="p-6 bg-card/70 flex flex-col">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary/20 bg-muted shrink-0">
                          <img
                            src={t.photoUrl}
                            alt={`Foto de ${t.name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement;
                              const initials = t.name.split(" ").map(s => s[0]).slice(0, 2).join("");
                              const bg = t.gender === "f" ? "F472B6" : "3B82F6";
                              el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=fff&bold=true&size=128`;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.role}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1">
                        {Array.from({ length: t.stars }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">“{t.quote}”</p>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pages > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-background/80 border border-border shadow-sm hover:bg-background"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-background/80 border border-border shadow-sm hover:bg-background"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para página ${i + 1}`}
                onClick={() => setPage(i)}
                className={`h-2.5 rounded-full transition-all ${i === page ? "w-8 bg-primary" : "w-2.5 bg-muted/70 hover:bg-muted"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
