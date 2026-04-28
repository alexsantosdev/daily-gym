"use client"

import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ShareCardData } from "@/types/share"

export function ShareCard({ data, className }: { data: ShareCardData; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/20 via-background to-background p-4 text-foreground shadow-lg",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.22),_transparent_52%)]" />
      <div className="relative flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">DAILY-GYM</p>
          {data.badge ? <Badge variant="secondary">{data.badge}</Badge> : null}
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold leading-tight tracking-tight">{data.title}</p>
          {data.subtitle ? <p className="text-sm text-muted-foreground">{data.subtitle}</p> : null}
          <p className="text-xs text-muted-foreground">Por {data.userName}</p>
        </div>

        {data.photoUrl ? (
          <Image
            src={data.photoUrl}
            alt={data.title}
            width={1080}
            height={720}
            unoptimized
            className="h-36 w-full rounded-2xl border border-border/70 object-cover"
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {data.metrics.map((metric) => (
            <div
              key={`${metric.label}-${metric.value}`}
              className={cn(
                "rounded-xl border border-border/70 bg-card/80 p-2.5",
                metric.highlight && "border-primary/40 bg-primary/10"
              )}
            >
              <p className="text-[11px] text-muted-foreground">{metric.label}</p>
              <p className="text-base font-semibold leading-tight">
                {metric.value}
                {metric.suffix ? ` ${metric.suffix}` : ""}
              </p>
            </div>
          ))}
        </div>

        {data.highlight ? (
          <p className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
            {data.highlight}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{data.date}</span>
          <span>{data.footer ?? "daily-gym"}</span>
        </div>
      </div>
    </div>
  )
}
