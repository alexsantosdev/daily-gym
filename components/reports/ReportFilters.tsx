"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { getDateRangeFromPreset } from "@/lib/date"
import { getMealTypeLabel } from "@/lib/labels"
import { mealTypes } from "@/types/meal"
import { periodPresets, reportTypes, type ReportFilters } from "@/types/report"
import type { Workout, WorkoutPlan } from "@/types/workout"

interface ReportFiltersProps {
  value: ReportFilters
  plans: WorkoutPlan[]
  workouts: Workout[]
  onApply: (filters: ReportFilters) => void
}

export function ReportFilters({ value, plans, workouts, onApply }: ReportFiltersProps) {
  const [localValue, setLocalValue] = useState<ReportFilters>(value)

  const reportTypeLabels: Record<ReportFilters["type"], string> = {
    general: "Geral",
    workouts: "Treinos",
    meals: "Refeicoes",
  }

  const periodPresetLabels: Record<ReportFilters["periodPreset"], string> = {
    "7d": "7 dias",
    "15d": "15 dias",
    "30d": "30 dias",
    current_month: "Mes atual",
    custom: "Customizado",
  }

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const exerciseOptions = useMemo(
    () => [...new Set(workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.name)))],
    [workouts]
  )

  const muscleGroupOptions = useMemo(
    () => [...new Set(workouts.map((workout) => workout.muscleGroup))],
    [workouts]
  )

  function handlePresetChange(nextPreset: ReportFilters["periodPreset"]) {
    const range = getDateRangeFromPreset(nextPreset, localValue.periodStart, localValue.periodEnd)

    setLocalValue((prev) => ({
      ...prev,
      periodPreset: nextPreset,
      periodStart: range.periodStart,
      periodEnd: range.periodEnd,
    }))
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(localValue)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="period-preset">Periodo</Label>
        <Select
          id="period-preset"
          value={localValue.periodPreset}
          onChange={(event) =>
            handlePresetChange(event.target.value as ReportFilters["periodPreset"])
          }
        >
          {periodPresets.map((preset) => (
            <option key={preset} value={preset}>
              {periodPresetLabels[preset]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-type">Tipo de relatorio</Label>
        <Select
          id="report-type"
          value={localValue.type}
          onChange={(event) =>
            setLocalValue((prev) => ({ ...prev, type: event.target.value as ReportFilters["type"] }))
          }
        >
          {reportTypes.map((type) => (
            <option key={type} value={type}>
              {reportTypeLabels[type]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-start">Inicio</Label>
        <Input
          id="period-start"
          type="date"
          value={localValue.periodStart}
          onChange={(event) =>
            setLocalValue((prev) => ({ ...prev, periodStart: event.target.value, periodPreset: "custom" }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-end">Fim</Label>
        <Input
          id="period-end"
          type="date"
          value={localValue.periodEnd}
          onChange={(event) =>
            setLocalValue((prev) => ({ ...prev, periodEnd: event.target.value, periodPreset: "custom" }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-filter">Plano</Label>
        <Select
          id="plan-filter"
          value={localValue.planId ?? ""}
          onChange={(event) =>
            setLocalValue((prev) => ({ ...prev, planId: event.target.value || undefined }))
          }
        >
          <option value="">Todos</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="muscle-filter">Grupo muscular</Label>
        <Select
          id="muscle-filter"
          value={localValue.muscleGroup ?? ""}
          onChange={(event) =>
            setLocalValue((prev) => ({ ...prev, muscleGroup: event.target.value || undefined }))
          }
        >
          <option value="">Todos</option>
          {muscleGroupOptions.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exercise-filter">Exercicio</Label>
        <Select
          id="exercise-filter"
          value={localValue.exerciseName ?? ""}
          onChange={(event) =>
            setLocalValue((prev) => ({ ...prev, exerciseName: event.target.value || undefined }))
          }
        >
          <option value="">Todos</option>
          {exerciseOptions.map((exercise) => (
            <option key={exercise} value={exercise}>
              {exercise}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meal-filter">Tipo de refeicao</Label>
        <Select
          id="meal-filter"
          value={localValue.mealType ?? ""}
          onChange={(event) =>
            setLocalValue((prev) => ({
              ...prev,
              mealType: (event.target.value || undefined) as ReportFilters["mealType"],
            }))
          }
        >
          <option value="">Todos</option>
          {mealTypes.map((type) => (
            <option key={type} value={type}>
              {getMealTypeLabel(type)}
            </option>
          ))}
        </Select>
      </div>

      <div className="sm:col-span-2 xl:col-span-4">
        <Button type="submit" className="h-11 w-full sm:w-auto">
          Aplicar filtros
        </Button>
      </div>
    </form>
  )
}
