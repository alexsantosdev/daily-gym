import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getMealTypeLabel, getWorkoutExecutionStatusLabel } from "@/lib/labels"
import { formatTimePtBr } from "@/lib/date"
import type { Activity } from "@/types/activity"
import type { Meal } from "@/types/meal"
import type { WorkoutExecution } from "@/types/workout"

export function DayDetails({
  date,
  meals,
  executions,
  activities,
  workoutNameById,
  flat,
}: {
  date: string
  meals: Meal[]
  executions: WorkoutExecution[]
  activities: Activity[]
  workoutNameById: Record<string, string>
  flat?: boolean
}) {
  const totalDuration = executions.reduce((acc, execution) => acc + (execution.durationMinutes ?? 0), 0)

  const content = (
    <CardContent className="space-y-3 pt-5">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Refeicoes</p>
          <p className="text-2xl font-semibold">{meals.length}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Treinos</p>
          <p className="text-2xl font-semibold">{executions.length}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Atividades</p>
          <p className="text-2xl font-semibold">{activities.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">Duracao total de treino</p>
        <p className="text-2xl font-semibold">{totalDuration} min</p>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">Refeicoes do dia</p>
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem refeicoes para este dia.</p>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="space-y-2 rounded-xl border border-border/70 p-2">
              {meal.photoUrl ? (
                <Image
                  src={meal.photoUrl}
                  alt={meal.description}
                  width={960}
                  height={320}
                  unoptimized
                  className="h-24 w-full rounded-md object-cover"
                />
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm leading-relaxed">{meal.time} - {meal.description}</span>
                <Badge variant="secondary">{getMealTypeLabel(meal.mealType)}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">Atividades do dia</p>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem atividades para este dia.</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="space-y-2 rounded-xl border border-border/70 p-2">
              {activity.photoUrl ? (
                <Image
                  src={activity.photoUrl}
                  alt={activity.name}
                  width={960}
                  height={320}
                  unoptimized
                  className="h-24 w-full rounded-md object-cover"
                />
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm leading-relaxed">{activity.name}</span>
                <Badge variant="outline">{activity.durationMinutes ?? 0} min</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Horario: {formatTimePtBr(activity.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">Status dos treinos</p>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem treinos para este dia.</p>
        ) : (
          executions.map((execution) => (
            <Link
              key={execution.id}
              href={`/workouts?tab=history&executionId=${execution.id}`}
              className="flex items-center justify-between rounded-xl border border-border/70 p-2 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div>
                <p className="text-sm font-medium">{workoutNameById[execution.workoutId] ?? "Treino"}</p>
                <p className="text-xs text-muted-foreground">Duracao: {execution.durationMinutes ?? 0} min</p>
              </div>
              <Badge variant={execution.status === "executed" ? "default" : "outline"}>
                {getWorkoutExecutionStatusLabel(execution.status)}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </CardContent>
  )

  if (flat) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Detalhes do dia {date}</h3>
        {content}
      </section>
    )
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Detalhes do dia {date}</CardTitle>
      </CardHeader>
      {content}
    </Card>
  )
}
