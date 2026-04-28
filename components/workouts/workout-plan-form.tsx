"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getWeekdayShortLabel } from "@/lib/date"
import { getWorkoutPlanGoalLabel, getWorkoutPlanStatusLabel } from "@/lib/labels"
import {
  workoutPlanGoals,
  workoutPlanStatus,
  type WorkoutPlan,
  type WorkoutPlanGoal,
  type WorkoutPlanStatus,
} from "@/types/workout"

export interface WorkoutPlanFormValues {
  name: string
  goal: WorkoutPlanGoal
  description: string
  weekdays: number[]
  status: WorkoutPlanStatus
}

const defaultValues: WorkoutPlanFormValues = {
  name: "",
  goal: "hypertrophy",
  description: "",
  weekdays: [],
  status: "active",
}

function toFormValues(plan: WorkoutPlan): WorkoutPlanFormValues {
  return {
    name: plan.name,
    goal: plan.goal,
    description: plan.description ?? "",
    weekdays: plan.weekdays,
    status: plan.status,
  }
}

export function WorkoutPlanForm({
  initialPlan,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  initialPlan?: WorkoutPlan
  isSubmitting?: boolean
  onSubmit: (values: WorkoutPlanFormValues) => Promise<void>
  onCancel?: () => void
}) {
  const [values, setValues] = useState<WorkoutPlanFormValues>(
    initialPlan ? toFormValues(initialPlan) : defaultValues
  )

  useEffect(() => {
    setValues(initialPlan ? toFormValues(initialPlan) : defaultValues)
  }, [initialPlan])

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(values)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="plan-name">Nome do plano</Label>
        <Input
          id="plan-name"
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-goal">Objetivo</Label>
        <Select
          id="plan-goal"
          value={values.goal}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, goal: event.target.value as WorkoutPlanGoal }))
          }
        >
          {workoutPlanGoals.map((goal) => (
            <option key={goal} value={goal}>
              {getWorkoutPlanGoalLabel(goal)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-description">Descricao</Label>
        <Textarea
          id="plan-description"
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Dias planejados</Label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
            const selected = values.weekdays.includes(dayIndex)

            return (
              <Button
                key={dayIndex}
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setValues((prev) => ({
                    ...prev,
                    weekdays: selected
                      ? prev.weekdays.filter((day) => day !== dayIndex)
                      : [...prev.weekdays, dayIndex],
                  }))
                }
              >
                {getWeekdayShortLabel(dayIndex)}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-status">Status</Label>
        <Select
          id="plan-status"
          value={values.status}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, status: event.target.value as WorkoutPlanStatus }))
          }
        >
          {workoutPlanStatus.map((status) => (
            <option key={status} value={status}>
              {getWorkoutPlanStatusLabel(status)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : initialPlan ? "Atualizar plano" : "Criar plano"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
