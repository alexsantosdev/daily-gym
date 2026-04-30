"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { todayIsoDate } from "@/lib/date"
import { mealTypes, type Meal, type MealType } from "@/types/meal"

const mealLabels: Record<MealType, string> = {
  breakfast: "Cafe da manha",
  lunch: "Almoco",
  dinner: "Jantar",
  snack: "Lanche",
  pre_workout: "Pre-treino",
  post_workout: "Pos-treino",
  other: "Outro",
}

export interface MealFormValues {
  date: string
  time: string
  mealType: MealType
  description: string
  notes: string
  tags: string
  photoFile: File | null
}

const baseDefaults: MealFormValues = {
  date: todayIsoDate(),
  time: new Date().toTimeString().slice(0, 5),
  mealType: "breakfast",
  description: "",
  notes: "",
  tags: "",
  photoFile: null,
}

function toValues(meal: Meal): MealFormValues {
  return {
    date: meal.date,
    time: meal.time,
    mealType: meal.mealType,
    description: meal.description,
    notes: meal.notes ?? "",
    tags: meal.tags.join(", "),
    photoFile: null,
  }
}

export function MealForm({
  initialMeal,
  mode = "full",
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  initialMeal?: Meal
  mode?: "quick" | "full"
  isSubmitting?: boolean
  onSubmit: (values: MealFormValues) => Promise<void>
  onCancel?: () => void
}) {
  const [values, setValues] = useState<MealFormValues>(initialMeal ? toValues(initialMeal) : baseDefaults)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialMeal?.photoUrl ?? null)

  useEffect(() => {
    setValues(initialMeal ? toValues(initialMeal) : baseDefaults)
    setPreviewUrl(initialMeal?.photoUrl ?? null)
  }, [initialMeal])

  useEffect(() => {
    if (!values.photoFile) {
      return
    }

    const fileUrl = URL.createObjectURL(values.photoFile)
    setPreviewUrl(fileUrl)

    return () => {
      URL.revokeObjectURL(fileUrl)
    }
  }, [values.photoFile])

  const isQuick = mode === "quick"

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return "Salvando..."
    }

    if (initialMeal) {
      return "Atualizar refeicao"
    }

    return isQuick ? "Salvar rapido" : "Registrar refeicao"
  }, [initialMeal, isQuick, isSubmitting])

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
          <Label htmlFor="meal-date">Data</Label>
          <Input
            id="meal-date"
            type="date"
            value={values.date}
            onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meal-time">Horario</Label>
          <Input
            id="meal-time"
            type="time"
            value={values.time}
            onChange={(event) => setValues((prev) => ({ ...prev, time: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meal-type">Tipo de refeicao</Label>
        <Select
          id="meal-type"
          value={values.mealType}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, mealType: event.target.value as MealType }))
          }
        >
          {mealTypes.map((type) => (
            <option key={type} value={type}>
              {mealLabels[type]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meal-description">Descricao</Label>
        <Textarea
          id="meal-description"
          placeholder="Ex: arroz, frango, salada"
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
          required
        />
      </div>

      {!isQuick ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="meal-notes">Observacoes</Label>
            <Textarea
              id="meal-notes"
              value={values.notes}
              onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meal-tags">Tags (separadas por virgula)</Label>
            <Input
              id="meal-tags"
              value={values.tags}
              onChange={(event) => setValues((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder="proteina, saudavel"
            />
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="meal-photo">Foto</Label>
        <Input
          id="meal-photo"
          type="file"
          accept="image/*"
          onChange={(event) =>
            setValues((prev) => ({ ...prev, photoFile: event.target.files?.[0] ?? null }))
          }
        />
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Preview da refeicao"
            width={1200}
            height={480}
            unoptimized
            className="h-40 w-full rounded-lg object-cover"
          />
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma imagem selecionada.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
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
