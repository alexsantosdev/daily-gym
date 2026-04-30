"use client"

import { getWeekdayShortLabel, parseIsoDateLocal, todayIsoDate } from "@/lib/date"
import { cn } from "@/lib/utils"
import type { CalendarStreakStatus } from "@/types/streak"

function getStatusClass(status: CalendarStreakStatus["status"], isActiveToday: boolean) {
  if (isActiveToday) {
    return "border-primary/50 bg-primary/20 text-primary"
  }

  if (status === "completed") {
    return "border-primary/40 bg-primary/15 text-primary"
  }

  if (status === "missed") {
    return "border-destructive/30 bg-destructive/10 text-destructive"
  }

  if (status === "pending") {
    return "border-primary/30 border-dashed bg-background text-foreground"
  }

  return "border-border/70 bg-muted/40 text-muted-foreground"
}

function getStatusMarker(status: CalendarStreakStatus["status"], isActiveToday: boolean) {
  if (isActiveToday) {
    return "ATV"
  }

  if (status === "completed") {
    return "OK"
  }

  if (status === "missed") {
    return "X"
  }

  if (status === "pending") {
    return "."
  }

  return "-"
}

export function StreakCalendar({
  statuses,
  isActiveToday = false,
}: {
  statuses: CalendarStreakStatus[]
  isActiveToday?: boolean
}) {
  const today = todayIsoDate()

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Ultimos dias da ofensiva</p>
      <div className="grid grid-cols-7 gap-1.5">
        {statuses.map((item) => {
          const date = parseIsoDateLocal(item.date)
          const day = date.getDay()
          const isTodayActive = isActiveToday && item.date === today && item.status !== "completed"

          return (
            <div
              key={item.date}
              className={cn(
                "rounded-lg border p-2 text-center text-[11px] leading-tight",
                getStatusClass(item.status, isTodayActive)
              )}
            >
              <p className="font-medium">{getWeekdayShortLabel(day).slice(0, 3)}</p>
              <p>{String(date.getDate()).padStart(2, "0")}</p>
              <p className="text-xs font-semibold">{getStatusMarker(item.status, isTodayActive)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
