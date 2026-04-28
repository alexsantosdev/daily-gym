import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWeekdayLabel } from "@/lib/date"
import type { AIWorkoutPlanPayload } from "@/types/ai"

export function AIWorkoutPlanPreview({ payload }: { payload: AIWorkoutPlanPayload }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Preview do plano sugerido</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-sm font-medium">{payload.plan.name}</p>
          <p className="text-xs text-muted-foreground">{payload.plan.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dias: {payload.plan.weekdays.map((day) => getWeekdayLabel(day)).join(", ")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {payload.workouts.map((workout, index) => (
            <div key={`${workout.name}-${index}`} className="rounded-xl border border-border/70 p-3">
              <p className="text-sm font-medium">{workout.name}</p>
              <p className="text-xs text-muted-foreground">
                {workout.muscleGroup} · {getWeekdayLabel(workout.weekday)}
              </p>
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                {workout.exercises.map((exercise, exerciseIndex) => (
                  <p key={`${exercise.name}-${exerciseIndex}`}>
                    {exerciseIndex + 1}. {exercise.name} · {exercise.sets}x{exercise.reps}
                    {exercise.suggestedLoad ? ` · ${exercise.suggestedLoad}` : ""}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
