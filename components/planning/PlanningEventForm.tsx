"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getWeekdayLabel } from "@/lib/date"
import type { MealType } from "@/types/meal"
import type {
  PlanningEvent,
  PlanningEventType,
  PlanningRecurrence,
  UpdatePlanningEventInput,
} from "@/types/planning"
import type { ActivityType } from "@/types/activity"
import type { Workout, WorkoutPlan } from "@/types/workout"

export interface PlanningEventFormValues extends UpdatePlanningEventInput {
  title: string
  type: PlanningEventType
  date: string
  startTime: string
}

const recurrenceOptions: Array<{ value: PlanningRecurrence; label: string }> = [
  { value: "none", label: "Sem recorrencia" },
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
]

const mealOptions: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "Cafe da manha" },
  { value: "lunch", label: "Almoco" },
  { value: "dinner", label: "Jantar" },
  { value: "snack", label: "Lanche" },
  { value: "pre_workout", label: "Pre-treino" },
  { value: "post_workout", label: "Pos-treino" },
  { value: "other", label: "Outro" },
]

const activityOptions: Array<{ value: ActivityType | "run" | "zumba" | "other"; label: string }> = [
  { value: "walk", label: "Caminhada" },
  { value: "run", label: "Corrida" },
  { value: "dance", label: "Danca" },
  { value: "zumba", label: "Zumba" },
  { value: "cardio", label: "Cardio" },
  { value: "other", label: "Outro" },
]

function getDefaultValues(selectedDate: string): PlanningEventFormValues {
  return {
    title: "",
    type: "meal",
    date: selectedDate,
    startTime: "07:00",
    endTime: undefined,
    recurrence: "none",
    weekdays: [],
    relatedWorkoutId: undefined,
    relatedWorkoutPlanId: undefined,
    mealType: "breakfast",
    activityType: "walk",
    notes: undefined,
    status: "planned",
  }
}

function toFormValues(event: PlanningEvent): PlanningEventFormValues {
  return {
    title: event.title,
    type: event.type,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    recurrence: event.recurrence ?? "none",
    weekdays: event.weekdays ?? [],
    relatedWorkoutId: event.relatedWorkoutId,
    relatedWorkoutPlanId: event.relatedWorkoutPlanId,
    mealType: event.mealType,
    activityType: event.activityType,
    notes: event.notes,
    status: event.status,
  }
}

export function PlanningEventForm({
  selectedDate,
  workouts,
  plans,
  initialEvent,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  selectedDate: string
  workouts: Workout[]
  plans: WorkoutPlan[]
  initialEvent?: PlanningEvent
  isSubmitting?: boolean
  onSubmit: (values: PlanningEventFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState<PlanningEventFormValues>(() =>
    initialEvent ? toFormValues(initialEvent) : getDefaultValues(selectedDate)
  )

  useEffect(() => {
    setValues(initialEvent ? toFormValues(initialEvent) : getDefaultValues(selectedDate))
  }, [initialEvent, selectedDate])

  const filteredWorkouts = useMemo(() => {
    if (!values.relatedWorkoutPlanId) {
      return workouts
    }

    return workouts.filter((item) => item.planId === values.relatedWorkoutPlanId)
  }, [values.relatedWorkoutPlanId, workouts])

  const selectedWorkout = filteredWorkouts.find((item) => item.id === values.relatedWorkoutId)

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(values)
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="planning-type">Tipo</Label>
          <Select
            id="planning-type"
            value={values.type}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                type: event.target.value as PlanningEventType,
                relatedWorkoutId: undefined,
                relatedWorkoutPlanId: undefined,
              }))
            }
          >
            <option value="meal">Refeicao</option>
            <option value="workout">Treino</option>
            <option value="activity">Atividade</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="planning-recurrence">Recorrencia</Label>
          <Select
            id="planning-recurrence"
            value={values.recurrence ?? "none"}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, recurrence: event.target.value as PlanningRecurrence }))
            }
          >
            {recurrenceOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planning-title">Titulo</Label>
        <Input
          id="planning-title"
          value={values.title}
          placeholder="Ex: Treino Superior, Cafe da manha"
          onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="planning-date">Data</Label>
          <Input
            id="planning-date"
            type="date"
            value={values.date}
            onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planning-start-time">Inicio</Label>
          <Input
            id="planning-start-time"
            type="time"
            value={values.startTime}
            onChange={(event) => setValues((prev) => ({ ...prev, startTime: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planning-end-time">Fim (opcional)</Label>
          <Input
            id="planning-end-time"
            type="time"
            value={values.endTime ?? ""}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, endTime: event.target.value || undefined }))
            }
          />
        </div>
      </div>

      {values.recurrence === "weekly" ? (
        <div className="space-y-2">
          <Label>Dias da semana</Label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, day) => {
              const active = values.weekdays?.includes(day)
              return (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() =>
                    setValues((prev) => {
                      const weekdays = prev.weekdays ?? []
                      return {
                        ...prev,
                        weekdays: active
                          ? weekdays.filter((item) => item !== day)
                          : [...weekdays, day].sort((a, b) => a - b),
                      }
                    })
                  }
                >
                  {getWeekdayLabel(day).slice(0, 3)}
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}

      {values.type === "meal" ? (
        <div className="space-y-2">
          <Label htmlFor="planning-meal-type">Tipo de refeicao</Label>
          <Select
            id="planning-meal-type"
            value={values.mealType ?? "breakfast"}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, mealType: event.target.value as MealType }))
            }
          >
            {mealOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {values.type === "workout" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="planning-workout-plan">Plano</Label>
            <Select
              id="planning-workout-plan"
              value={values.relatedWorkoutPlanId ?? "none"}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  relatedWorkoutPlanId: event.target.value === "none" ? undefined : event.target.value,
                  relatedWorkoutId: undefined,
                }))
              }
            >
              <option value="none">Sem plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planning-workout">Treino</Label>
            <Select
              id="planning-workout"
              value={values.relatedWorkoutId ?? "none"}
              onChange={(event) => {
                const workoutId = event.target.value === "none" ? undefined : event.target.value
                const selected = filteredWorkouts.find((item) => item.id === workoutId)
                setValues((prev) => ({
                  ...prev,
                  relatedWorkoutId: workoutId,
                  title: selected ? selected.name : prev.title,
                }))
              }}
            >
              <option value="none">Selecionar treino</option>
              {filteredWorkouts.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.name}
                </option>
              ))}
            </Select>
            {selectedWorkout ? (
              <p className="text-xs text-muted-foreground">Grupo: {selectedWorkout.muscleGroup}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {values.type === "activity" ? (
        <div className="space-y-2">
          <Label htmlFor="planning-activity-type">Tipo de atividade</Label>
          <Select
            id="planning-activity-type"
            value={values.activityType ?? "walk"}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                activityType: event.target.value as ActivityType | "run" | "zumba" | "other",
              }))
            }
          >
            {activityOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="planning-notes">Observacoes</Label>
        <Textarea
          id="planning-notes"
          value={values.notes ?? ""}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value || undefined }))}
          placeholder="Opcional"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : initialEvent ? "Atualizar planejamento" : "Criar planejamento"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

