"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getWeekdayLabel } from "@/lib/date"
import type { Workout, WorkoutExercise, WorkoutPlan } from "@/types/workout"

interface WorkoutFormValues {
  planId: string
  name: string
  muscleGroup: string
  weekday?: number
  order: number
  exercisesText: string
}

const defaultValues: WorkoutFormValues = {
  planId: "",
  name: "",
  muscleGroup: "",
  weekday: undefined,
  order: 0,
  exercisesText: "",
}

function serializeExercises(exercises: WorkoutExercise[]) {
  return exercises
    .map((exercise) =>
      [
        exercise.name,
        exercise.muscleGroup,
        exercise.sets,
        exercise.reps,
        exercise.suggestedLoad ?? "",
        exercise.notes ?? "",
      ].join("|")
    )
    .join("\n")
}

function parseExercises(exercisesText: string): WorkoutExercise[] {
  return exercisesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, muscleGroup, sets, reps, suggestedLoad, notes] = line
        .split("|")
        .map((part) => part.trim())

      return {
        name,
        muscleGroup,
        sets: Number(sets || 0),
        reps: Number(reps || 0),
        suggestedLoad: suggestedLoad || undefined,
        notes: notes || undefined,
      }
    })
}

function toFormValues(workout: Workout): WorkoutFormValues {
  return {
    planId: workout.planId,
    name: workout.name,
    muscleGroup: workout.muscleGroup,
    weekday: workout.weekday,
    order: workout.order,
    exercisesText: serializeExercises(workout.exercises),
  }
}

export function WorkoutForm({
  plans,
  initialWorkout,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  plans: WorkoutPlan[]
  initialWorkout?: Workout
  isSubmitting?: boolean
  onSubmit: (values: WorkoutFormValues, exercises: WorkoutExercise[]) => Promise<void>
  onCancel?: () => void
}) {
  const [values, setValues] = useState<WorkoutFormValues>(
    initialWorkout
      ? toFormValues(initialWorkout)
      : {
          ...defaultValues,
          planId: plans[0]?.id ?? "",
        }
  )

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === values.planId),
    [plans, values.planId]
  )

  const weekdayOptions = useMemo(() => {
    if (selectedPlan && selectedPlan.weekdays.length > 0) {
      return [...selectedPlan.weekdays].sort((a, b) => a - b)
    }

    return [0, 1, 2, 3, 4, 5, 6]
  }, [selectedPlan])

  useEffect(() => {
    if (initialWorkout) {
      setValues(toFormValues(initialWorkout))
      return
    }

    setValues({
      ...defaultValues,
      planId: plans[0]?.id ?? "",
      weekday: plans[0]?.weekdays[0],
    })
  }, [initialWorkout, plans])

  useEffect(() => {
    if (values.weekday === undefined) {
      setValues((prev) => ({ ...prev, weekday: weekdayOptions[0] }))
      return
    }

    if (!weekdayOptions.includes(values.weekday)) {
      setValues((prev) => ({ ...prev, weekday: weekdayOptions[0] }))
    }
  }, [weekdayOptions, values.weekday])

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(values, parseExercises(values.exercisesText))
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="workout-plan">Plano</Label>
        <Select
          id="workout-plan"
          value={values.planId}
          onChange={(event) => setValues((prev) => ({ ...prev, planId: event.target.value }))}
          required
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workout-name">Nome do treino</Label>
          <Input
            id="workout-name"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workout-group">Grupo muscular</Label>
          <Input
            id="workout-group"
            value={values.muscleGroup}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, muscleGroup: event.target.value }))
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workout-weekday">Dia da semana</Label>
          <Select
            id="workout-weekday"
            value={values.weekday !== undefined ? String(values.weekday) : ""}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, weekday: Number(event.target.value) }))
            }
            required
          >
            {weekdayOptions.map((weekday) => (
              <option key={weekday} value={weekday}>
                {getWeekdayLabel(weekday)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workout-order">Ordem</Label>
          <Input
            id="workout-order"
            type="number"
            min={0}
            value={values.order}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, order: Number(event.target.value) }))
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workout-exercises">Exercicios (1 linha por exercicio)</Label>
        <Textarea
          id="workout-exercises"
          value={values.exercisesText}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, exercisesText: event.target.value }))
          }
          placeholder="Supino reto|Peito|4|10|40kg|Controle na descida"
          required
        />
        <p className="text-xs text-muted-foreground">
          Formato: nome|grupo muscular|series|repeticoes|carga sugerida|observacoes
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : initialWorkout ? "Atualizar treino" : "Criar treino"}
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
