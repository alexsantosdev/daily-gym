"use client"

import { useState } from "react"

import { CaretDown, PencilSimpleLine, Trash } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Activity } from "@/types/activity"

const activityTypeLabel: Record<Activity["type"], string> = {
  walk: "Caminhada",
  dance: "Danca",
  cardio: "Cardio",
  custom: "Personalizada",
}

function toPaceLabel(speedMps?: number) {
  if (!speedMps || speedMps <= 0) {
    return "-"
  }

  const paceSeconds = 1000 / speedMps
  const minutes = Math.floor(paceSeconds / 60)
  const seconds = Math.round(paceSeconds % 60)
    .toString()
    .padStart(2, "0")

  return `${minutes}:${seconds} min/km`
}

export function ActivityHistoryList({
  activities,
  onEdit,
  onDelete,
}: {
  activities: Activity[]
  onEdit: (activity: Activity) => void
  onDelete: (activityId: string) => void
}) {
  const [openedActivityId, setOpenedActivityId] = useState<string | null>(null)

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => {
        const isOpen = openedActivityId === activity.id

        return (
          <article key={activity.id} className="rounded-2xl border border-border/70 bg-card/70">
            <div className="flex flex-col gap-3 px-3 py-3.5">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpenedActivityId((prev) => (prev === activity.id ? null : activity.id))}
              >
                <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tracking-tight">{activity.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {activity.date} - {activity.durationMinutes ?? 0} min
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-[430px]:justify-end">
                    <Badge variant="secondary">{activityTypeLabel[activity.type] ?? "Atividade"}</Badge>
                    {activity.source === "strava" ? <Badge variant="outline">Strava</Badge> : null}
                    <CaretDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </div>
                </div>
              </button>

              <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-end">
                <Button
                  size="xs"
                  className="h-8 w-full min-[430px]:w-auto"
                  variant="outline"
                  onClick={() => onEdit(activity)}
                >
                  <PencilSimpleLine data-icon="inline-start" />
                  Editar
                </Button>
                <Button
                  size="xs"
                  className="h-8 w-full min-[430px]:w-auto"
                  variant="destructive"
                  onClick={() => onDelete(activity.id)}
                >
                  <Trash data-icon="inline-start" />
                  Excluir
                </Button>
              </div>

              {isOpen ? (
                <div className="flex flex-col gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Tipo:</span> {activityTypeLabel[activity.type] ?? "Atividade"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Data:</span> {activity.date}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Duracao:</span> {activity.durationMinutes ?? 0} min
                  </p>
                  {activity.sourceMetadata ? (
                    <>
                      <p>
                        <span className="font-medium text-foreground">Distancia:</span>{" "}
                        {typeof activity.sourceMetadata.distanceMeters === "number"
                          ? `${(activity.sourceMetadata.distanceMeters / 1000).toFixed(2)} km`
                          : "-"}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Ritmo medio:</span>{" "}
                        {toPaceLabel(activity.sourceMetadata.averageSpeedMps)}
                      </p>
                    </>
                  ) : null}
                  {activity.notes ? (
                    <p>
                      <span className="font-medium text-foreground">Observacoes:</span> {activity.notes}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
