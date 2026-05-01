"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getWeekdayLabel } from "@/lib/date"
import { normalizeRepsValue } from "@/lib/reps"
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

function parsePositiveNumber(value?: string, fallback = 0) {
  if (!value) {
    return fallback
  }

  const normalized = value.replace(",", ".").trim()
  const direct = Number(normalized)

  if (Number.isFinite(direct)) {
    return direct
  }

  // Support formats like "8-10", "10 a 12" and "12+" by using the first number.
  const matched = normalized.match(/\d+(\.\d+)?/)
  if (!matched) {
    return fallback
  }

  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : fallback
}

function parsePipeExerciseLine(line: string): WorkoutExercise | null {
  if (!line.includes("|")) {
    return null
  }

  const [name, muscleGroup, sets, reps, suggestedLoad, notes] = line
    .split("|")
    .map((part) => part.trim())

  if (!name) {
    return null
  }

  return {
    name,
    muscleGroup: muscleGroup || "Geral",
    sets: parsePositiveNumber(sets, 0),
    reps: normalizeRepsValue(reps, "0"),
    suggestedLoad: suggestedLoad || undefined,
    notes: notes || undefined,
  }
}

function parseCardioBlock(exercisesText: string): WorkoutExercise[] {
  const lines = exercisesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return []
  }

  const titleLine = lines[0] ?? ""
  const objectiveLine = lines.find((line) => /^objetivo\s*:/i.test(line))
  const structureStart = lines.findIndex((line) => /^estrutura\s*:/i.test(line))
  const progressionStart = lines.findIndex((line) =>
    /^(?:[^\p{L}\p{N}]*)?progress[aã]o\s*:/iu.test(line)
  )
  const distanceLine = lines.find((line) => /\b\d+(?:[.,]\d+)?\s*km\b/i.test(line))
  const rhythmLine = lines.find((line) => /(ritmo|zona\s*\d|pace)/i.test(line))

  const structureEnd =
    progressionStart > structureStart && structureStart >= 0 ? progressionStart : lines.length
  const structureLines =
    structureStart >= 0
      ? lines
          .slice(structureStart + 1, structureEnd)
          .filter((line) => !/^(?:[^\p{L}\p{N}]*)?progress[aã]o\s*:/iu.test(line))
      : []

  const progressionLines =
    progressionStart >= 0
      ? lines.slice(progressionStart + 1).filter((line) => !/^estrutura\s*:/i.test(line))
      : []

  const normalizedName = titleLine
    .replace(/^treino\s*\d*\s*[–-]\s*/i, "")
    .trim()

  const objectiveText = objectiveLine?.replace(/^objetivo\s*:\s*/i, "").trim()
  const structureText = structureLines.join(" | ")
  const progressionText = progressionLines.join(" | ")

  const notes = [objectiveText, distanceLine, structureText, progressionText]
    .filter((value) => Boolean(value && value.trim()))
    .join(" | ")

  return [
    {
      name: normalizedName || "Corrida",
      muscleGroup: "Cardio",
      sets: 1,
      reps: "1",
      suggestedLoad: rhythmLine || undefined,
      notes: notes || undefined,
    },
  ]
}

function parseExercises(exercisesText: string): WorkoutExercise[] {
  const rows = exercisesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const parsedPipeRows = rows
    .map((line) => parsePipeExerciseLine(line))
    .filter((item): item is WorkoutExercise => Boolean(item))

  if (parsedPipeRows.length > 0) {
    return parsedPipeRows
  }

  return parseCardioBlock(exercisesText)
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
          Formato 1: nome|grupo muscular|series|repeticoes|carga sugerida|observacoes.
          Repeticoes aceitam faixa (ex.: 8-10).
          Formato 2 (cardio/hibrido): bloco com titulo + Objetivo + Estrutura + Progressao.
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
