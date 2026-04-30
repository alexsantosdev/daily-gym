"use client"

import { PlanningEventCard } from "@/components/planning/PlanningEventCard"
import type { PlanningEvent } from "@/types/planning"

export function PlanningDayDetails({
  date,
  events,
  onEdit,
  onDelete,
  onMarkCompleted,
  onMarkSkipped,
}: {
  date: string
  events: PlanningEvent[]
  onEdit: (event: PlanningEvent) => void
  onDelete: (eventId: string) => void
  onMarkCompleted: (eventId: string) => void
  onMarkSkipped: (eventId: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Eventos do dia</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          Nenhum planejamento para este dia.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <PlanningEventCard
              key={event.id}
              event={event}
              onEdit={onEdit}
              onDelete={onDelete}
              onMarkCompleted={onMarkCompleted}
              onMarkSkipped={onMarkSkipped}
            />
          ))}
        </div>
      )}
    </div>
  )
}

