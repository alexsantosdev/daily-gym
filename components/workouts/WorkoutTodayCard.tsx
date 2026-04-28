import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWeekdayLabel } from "@/lib/date"
import { WorkoutReceipt } from "@/components/workouts/WorkoutReceipt"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

export function WorkoutTodayCard({
  plannedWorkout,
  plannedPlan,
  executionToday,
  executionWorkout,
  executionPlan,
}: {
  plannedWorkout: Workout | null
  plannedPlan?: WorkoutPlan | null
  executionToday?: WorkoutExecution | null
  executionWorkout?: Workout | null
  executionPlan?: WorkoutPlan | null
}) {
  const hasTrainedToday = Boolean(executionToday)
  const workout = executionWorkout ?? plannedWorkout
  const plan = executionPlan ?? plannedPlan

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasTrainedToday ? "Treino feito hoje" : "Treino de hoje"}</CardTitle>
      </CardHeader>
      <CardContent>
        {workout ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{workout.name}</p>
                <p className="text-xs text-muted-foreground">{workout.muscleGroup}</p>
              </div>
              {typeof workout.weekday === "number" ? <Badge>{getWeekdayLabel(workout.weekday)}</Badge> : null}
            </div>
            <WorkoutReceipt
              workout={workout}
              plan={plan ?? undefined}
              mode={hasTrainedToday ? "executed" : "planned"}
              execution={executionToday ?? undefined}
              compact
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nao ha treino associado para hoje.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/workouts">Cadastrar plano/treino</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
