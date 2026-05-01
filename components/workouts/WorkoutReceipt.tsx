import { Receipt, Timer } from "@phosphor-icons/react"

import { formatDatePtBr, formatDateTimePtBr, formatWeekdayDatePtBr, minutesBetween } from "@/lib/date"
import { getWorkoutExecutionStatusLabel, getWorkoutPlanGoalLabel } from "@/lib/labels"
import { buildWorkoutReceiptItems } from "@/lib/workoutReceipt"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

export function WorkoutReceipt({
  plan,
  workout,
  execution,
  mode,
  compact,
  flat,
}: {
  plan?: WorkoutPlan
  workout?: Workout
  execution?: WorkoutExecution
  mode: "planned" | "executed"
  compact?: boolean
  flat?: boolean
}) {
  const receiptItems = buildWorkoutReceiptItems(workout, mode === "executed" ? execution : undefined)
  const hasCardioItems = receiptItems.some((item) => item.isCardio)
  const hasStrengthItems = receiptItems.some((item) => !item.isCardio)
  const workoutModeLabel = hasCardioItems && hasStrengthItems
    ? "Hibrido"
    : hasCardioItems
      ? "Cardio"
      : "Forca"
  const completedCount = receiptItems.filter((item) => item.completed).length
  const workoutStatus = execution?.status ?? (mode === "executed" ? "executed" : "planned")
  const durationMinutes = execution?.durationMinutes ?? minutesBetween(execution?.startedAt, execution?.finishedAt)
  const baseDate = execution?.startedAt ?? execution?.date ?? new Date().toISOString()

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-2xl bg-card p-4 text-card-foreground",
        flat ? "border-0 shadow-none" : "border border-border/80 shadow-sm",
        compact ? "max-w-md" : "max-w-2xl"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">DAILY-GYM</p>
          <p className="font-mono text-lg font-bold uppercase tracking-wider">Ficha de Treino</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Receipt className="size-5 text-muted-foreground" />
          <Badge variant={workoutModeLabel === "Cardio" ? "default" : "secondary"}>{workoutModeLabel}</Badge>
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-border" />

      <div className="space-y-1.5 break-words font-mono text-xs">
        <p>
          Plano: <span className="font-semibold">{plan?.name ?? "-"}</span>
        </p>
        <p>
          Treino: <span className="font-semibold">{workout?.name ?? "-"}</span>
        </p>
        <p>
          Data: <span className="font-semibold capitalize">{formatWeekdayDatePtBr(baseDate)}</span>
        </p>
        <p>
          Objetivo: <span className="font-semibold">{plan ? getWorkoutPlanGoalLabel(plan.goal) : "-"}</span>
        </p>
        <p>
          Grupo: <span className="font-semibold">{workout?.muscleGroup ?? "-"}</span>
        </p>
        <p>
          Status: <span className="font-semibold">{getWorkoutExecutionStatusLabel(workoutStatus)}</span>
        </p>
        {mode === "executed" ? (
          <p>
            Duracao: <span className="font-semibold">{durationMinutes} min</span>
          </p>
        ) : null}
        {execution?.checkinAt ? (
          <p>
            Check-in: <span className="font-semibold">{formatDateTimePtBr(execution.checkinAt)}</span>
          </p>
        ) : null}
        {execution?.checkoutAt ? (
          <p>
            Check-out: <span className="font-semibold">{formatDateTimePtBr(execution.checkoutAt)}</span>
          </p>
        ) : null}
      </div>

      <div className="my-3 border-t border-dashed border-border" />

      <div className="space-y-3 break-words font-mono text-xs">
        {receiptItems.length === 0 ? (
          <p className="text-muted-foreground">Sem exercicios para esta ficha.</p>
        ) : (
          receiptItems.map((item) => (
            <div key={`${item.name}-${item.index}`} className="space-y-1">
              <p className="font-semibold">
                {String(item.index).padStart(2, "0")}. {item.name}
              </p>
              {item.muscleGroup ? <p className="text-muted-foreground">Grupo: {item.muscleGroup}</p> : null}
              <p className="text-muted-foreground">
                {item.isCardio
                  ? `Planejado (cardio): ${item.plannedCardioSummary ?? "-"}`
                  : `Planejado: ${item.plannedSets ?? "-"}x${item.plannedReps ?? "-"}${
                      item.plannedLoad ? ` · ${item.plannedLoad}` : ""
                    }`}
              </p>
              {mode === "executed" ? (
                <p className="text-muted-foreground">
                  {item.isCardio
                    ? `Executado (cardio): ${item.executedCardioSummary ?? "-"}`
                    : `Executado: ${item.executedSets ?? "-"}x${item.executedReps ?? "-"}${
                        item.executedLoad ? ` · ${item.executedLoad}` : ""
                      }`}
                </p>
              ) : null}
              {mode === "executed" ? (
                <p className="text-muted-foreground">
                  Tempo no exercicio: {item.executedDurationMinutes ?? "-"} min
                </p>
              ) : null}
              <p className={cn("font-semibold", item.completed ? "text-primary" : "text-muted-foreground")}>
                Status: {item.completed ? "Concluido" : "Nao concluido"}
              </p>
              {item.notes ? <p className="text-muted-foreground">Obs: {item.notes}</p> : null}
            </div>
          ))
        )}
      </div>

      <div className="my-3 border-t border-dashed border-border" />

      <div className="space-y-1 break-words font-mono text-xs">
        <p>
          Total exercicios: <span className="font-semibold">{receiptItems.length}</span>
        </p>
        <p>
          Concluidos: <span className="font-semibold">{completedCount}/{receiptItems.length}</span>
        </p>
        {mode === "executed" ? (
          <p>
            Data da execucao: <span className="font-semibold">{formatDatePtBr(execution?.date)}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-dashed border-border pt-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>daily-gym.app</span>
        <span className="inline-flex items-center gap-1">
          <Timer className="size-3.5" />
          {mode === "executed" ? `${durationMinutes} min` : "Planejamento"}
        </span>
      </div>
    </div>
  )
}
