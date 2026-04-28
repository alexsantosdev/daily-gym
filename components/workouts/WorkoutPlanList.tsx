import { PencilSimpleLine, Trash } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getWeekdayLabel } from "@/lib/date"
import { getWorkoutPlanGoalLabel, getWorkoutPlanStatusLabel } from "@/lib/labels"
import type { WorkoutPlan } from "@/types/workout"

export function WorkoutPlanList({
  plans,
  onEdit,
  onDelete,
}: {
  plans: WorkoutPlan[]
  onEdit: (plan: WorkoutPlan) => void
  onDelete: (planId: string) => void
}) {
  if (plans.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
  }

  return (
    <div className="space-y-2">
      {plans.map((plan) => (
        <Card key={plan.id} className="border-border/70">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{getWorkoutPlanGoalLabel(plan.goal)}</p>
              </div>
              <Badge variant={plan.status === "active" ? "default" : "outline"}>
                {getWorkoutPlanStatusLabel(plan.status)}
              </Badge>
            </div>

            {plan.description ? <p className="text-sm">{plan.description}</p> : null}

            <div className="flex flex-wrap gap-1">
              {plan.weekdays.length > 0 ? (
                plan.weekdays.map((day) => (
                  <Badge key={`${plan.id}-${day}`} variant="secondary">
                    {getWeekdayLabel(day)}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Sem dias definidos</span>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="xs" variant="outline" onClick={() => onEdit(plan)}>
                <PencilSimpleLine className="mr-1 size-3" />
                Editar
              </Button>
              <Button size="xs" variant="destructive" onClick={() => onDelete(plan.id)}>
                <Trash className="mr-1 size-3" />
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
