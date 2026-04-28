"use client"

import { useEffect, useState } from "react"

import { CaretDown, ClockCountdown, Receipt, Trash } from "@phosphor-icons/react"

import { ShareButton } from "@/components/share/ShareButton"
import { WorkoutReceipt } from "@/components/workouts/WorkoutReceipt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buildWorkoutShareData } from "@/lib/share"
import { Separator } from "@/components/ui/separator"
import { formatDateTimePtBr } from "@/lib/date"
import { getWorkoutExecutionStatusLabel } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

export function WorkoutHistoryList({
  executions,
  workoutNameById,
  planNameById,
  workoutsById,
  plansById,
  onDelete,
  initialOpenedExecutionId,
  userName = "Atleta",
}: {
  executions: WorkoutExecution[]
  workoutNameById: Record<string, string>
  planNameById: Record<string, string>
  workoutsById: Record<string, Workout>
  plansById: Record<string, WorkoutPlan>
  onDelete: (executionId: string) => void
  initialOpenedExecutionId?: string
  userName?: string
}) {
  const [openedExecutionId, setOpenedExecutionId] = useState<string | null>(null)

  useEffect(() => {
    if (!initialOpenedExecutionId) {
      return
    }

    setOpenedExecutionId(initialOpenedExecutionId)
  }, [initialOpenedExecutionId])

  if (executions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma execucao registrada.</p>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
      {executions.map((execution) => {
        const isOpen = openedExecutionId === execution.id
        const workout = workoutsById[execution.workoutId]
        const exercisesTotal = workout?.exercises.length ?? execution.executedExercises.length
        const firstLoadUsed = execution.executedExercises.find((item) => Boolean(item.loadUsed))?.loadUsed
        const shareData = buildWorkoutShareData({
          userName,
          workoutName: workoutNameById[execution.workoutId] ?? "Treino",
          planName: planNameById[execution.planId] ?? undefined,
          execution,
          exercisesTotal,
          highlightLoad: firstLoadUsed,
        })

        return (
          <article key={execution.id} className="border-b border-border/60 last:border-b-0">
            <div className="flex flex-col gap-3 px-3 py-3.5 sm:px-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpenedExecutionId((prev) => (prev === execution.id ? null : execution.id))}
              >
                <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tracking-tight">{workoutNameById[execution.workoutId] ?? "Treino"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {planNameById[execution.planId] ?? "Plano"} • {execution.date}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-[430px]:justify-end">
                    <Badge variant={execution.status === "executed" ? "default" : "outline"}>
                      {getWorkoutExecutionStatusLabel(execution.status)}
                    </Badge>
                    <CaretDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </div>
                </div>
              </button>

              <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClockCountdown className="size-3.5" />
                  Duracao: {execution.durationMinutes ?? 0} min
                </span>
                <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center">
                  <Button size="xs" className="h-8 w-full min-[430px]:w-auto" variant="outline" onClick={() => setOpenedExecutionId(execution.id)}>
                    <Receipt data-icon="inline-start" />
                    Comprovante
                  </Button>
                  <ShareButton cardType="workout" data={shareData} size="xs" label="Compartilhar" />
                  <Button
                    size="xs"
                    className="h-8 w-full min-[430px]:w-auto"
                    variant="destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(execution.id)
                    }}
                  >
                    <Trash data-icon="inline-start" />
                    Excluir
                  </Button>
                </div>
              </div>

              {isOpen ? (
                <div className="flex flex-col gap-3 border-t border-border/60 pt-3 text-xs">
                  <div className="grid gap-2 min-[430px]:grid-cols-2">
                    <p className="text-muted-foreground">
                      Inicio: <span className="text-foreground">{formatDateTimePtBr(execution.startedAt)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Fim: <span className="text-foreground">{formatDateTimePtBr(execution.finishedAt)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Check-in: <span className="text-foreground">{formatDateTimePtBr(execution.checkinAt)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Check-out: <span className="text-foreground">{formatDateTimePtBr(execution.checkoutAt)}</span>
                    </p>
                  </div>

                  {execution.notes ? (
                    <p className="break-words rounded-lg border border-border/60 bg-muted/30 p-2 text-muted-foreground">
                      Observacoes: {execution.notes}
                    </p>
                  ) : null}

                  <Separator />

                  <WorkoutReceipt
                    mode="executed"
                    plan={plansById[execution.planId]}
                    workout={workoutsById[execution.workoutId]}
                    execution={execution}
                    compact
                    flat
                  />
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
