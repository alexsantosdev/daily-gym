import Link from "next/link"

import { Barbell, CheckCircle } from "@phosphor-icons/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { getWorkoutExecutionStatusLabel } from "@/lib/labels"
import type { Meal } from "@/types/meal"
import type { Workout, WorkoutExecution } from "@/types/workout"

export function TodaySummary({
  todayWorkout,
  mealsToday,
  lastExecution,
  todayExecution,
}: {
  todayWorkout: Workout | null
  mealsToday: Meal[]
  lastExecution: WorkoutExecution | null
  todayExecution: WorkoutExecution | null
}) {
  const mealsProgress = Math.min(100, mealsToday.length * 25)

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Hoje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Treino sugerido do dia</p>
          {todayWorkout ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">{todayWorkout.name}</p>
                <p className="text-xs text-muted-foreground">{todayWorkout.muscleGroup}</p>
              </div>
              {todayExecution ? (
                <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                  <Link href={`/workouts?tab=history&executionId=${todayExecution.id}`}>
                    <CheckCircle className="mr-1 size-4" />
                    Treino executado
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href={`/workouts?start=${todayWorkout.id}`}>
                    <Barbell className="mr-1 size-4" />
                    Iniciar treino
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Nenhum treino associado ao dia atual.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Progresso de refeicoes</p>
          <p className="mt-1 text-sm font-medium">{mealsToday.length} refeicao(oes) registradas</p>
          <Progress value={mealsProgress} className="mt-2" />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimo treino</p>
          {lastExecution ? (
            <Button asChild variant="ghost" className="mt-1 h-auto w-full justify-between rounded-lg px-2 py-2">
              <Link href={`/workouts?tab=history&executionId=${lastExecution.id}`}>
                <p className="text-sm">{lastExecution.date}</p>
                <Badge variant={lastExecution.status === "executed" ? "default" : "outline"}>
                  {getWorkoutExecutionStatusLabel(lastExecution.status)}
                </Badge>
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Sem execucao recente.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
