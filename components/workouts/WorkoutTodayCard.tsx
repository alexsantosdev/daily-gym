import Link from "next/link"

import { Barbell } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWeekdayLabel } from "@/lib/date"
import type { Workout, WorkoutPlan } from "@/types/workout"
import { WorkoutReceipt } from "@/components/workouts/WorkoutReceipt"

export function WorkoutTodayCard({
  workout,
  plan,
}: {
  workout: Workout | null
  plan?: WorkoutPlan | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Treino de hoje</CardTitle>
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
            <WorkoutReceipt workout={workout} plan={plan ?? undefined} mode="planned" compact />
            <Button asChild className="h-11 w-full">
              <Link href={`/workouts?start=${workout.id}`}>
                <Barbell className="mr-2 size-4" />
                Iniciar treino
              </Link>
            </Button>
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
