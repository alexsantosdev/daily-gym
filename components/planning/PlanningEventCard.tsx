"use client"

import Link from "next/link"

import { Check, ForkKnife, PersonSimpleWalk, SkipForward, Trash } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPlanningEventTypeLabel, getPlanningStatusLabel } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { PlanningEvent } from "@/types/planning"

function getStatusClass(status: PlanningEvent["status"]) {
  if (status === "completed") {
    return "bg-primary/15 text-primary border-primary/35"
  }

  if (status === "skipped") {
    return "bg-muted text-muted-foreground border-border"
  }

  return "bg-secondary text-secondary-foreground border-border"
}

function getTypeIcon(type: PlanningEvent["type"]) {
  if (type === "meal") {
    return <ForkKnife className="size-4" />
  }

  if (type === "activity") {
    return <PersonSimpleWalk className="size-4" />
  }

  return <span className="text-sm">🏋</span>
}

function getActionHref(event: PlanningEvent): string {
  if (event.type === "meal") {
    return `/meals?quick=1&plannedEventId=${event.id}`
  }

  if (event.type === "activity") {
    return `/activities?quick=1&plannedEventId=${event.id}`
  }

  return `/workouts?start=1&plannedEventId=${event.id}`
}

function getActionLabel(event: PlanningEvent): string {
  if (event.type === "meal") {
    return "Registrar refeicao"
  }

  if (event.type === "activity") {
    return "Registrar atividade"
  }

  return "Iniciar treino"
}

export function PlanningEventCard({
  event,
  onEdit,
  onDelete,
  onMarkCompleted,
  onMarkSkipped,
}: {
  event: PlanningEvent
  onEdit: (event: PlanningEvent) => void
  onDelete: (eventId: string) => void
  onMarkCompleted: (eventId: string) => void
  onMarkSkipped: (eventId: string) => void
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {event.startTime}
            {event.endTime ? ` - ${event.endTime}` : ""} • {getPlanningEventTypeLabel(event.type)}
          </p>
        </div>
        <Badge className={cn("border text-[11px]", getStatusClass(event.status))}>
          {getPlanningStatusLabel(event.status)}
        </Badge>
      </div>

      {event.notes ? <p className="mt-2 text-xs text-muted-foreground">{event.notes}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href={getActionHref(event)}>
            {getTypeIcon(event.type)}
            <span className="ml-1">{getActionLabel(event)}</span>
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(event)}>
          Editar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onMarkCompleted(event.id)}>
          <Check className="mr-1 size-4" />
          Concluir
        </Button>
        <Button size="sm" variant="outline" onClick={() => onMarkSkipped(event.id)}>
          <SkipForward className="mr-1 size-4" />
          Ignorar
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(event.id)}>
          <Trash className="mr-1 size-4" />
          Excluir
        </Button>
      </div>
    </div>
  )
}

