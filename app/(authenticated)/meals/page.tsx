"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Plus } from "@phosphor-icons/react"

import { PageHeader } from "@/components/layout/page-header"
import { MealForm, type MealFormValues } from "@/components/meals/meal-form"
import { MealList } from "@/components/meals/meal-list"
import { MealRecordsTable } from "@/components/meals/MealRecordsTable"
import { MealStats } from "@/components/meals/MealStats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useMeals } from "@/hooks/useMeals"
import { getMealTypeLabel } from "@/lib/labels"
import { uploadMealPhoto } from "@/services/mealService"
import { mealTypes, type Meal, type MealType } from "@/types/meal"

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export default function MealsPage() {
  const searchParams = useSearchParams()
  const quickParam = searchParams.get("quick") === "1"

  const { user } = useAuth()
  const { meals, isLoading, createMealEntry, updateMealEntry, deleteMealEntry } = useMeals(user?.uid)

  const [editingMeal, setEditingMeal] = useState<Meal | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(quickParam)

  const [dateFilter, setDateFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<MealType | "all">("all")

  useEffect(() => {
    if (quickParam) {
      setIsFormOpen(true)
    }
  }, [quickParam])

  useEffect(() => {
    if (editingMeal) {
      setIsFormOpen(true)
    }
  }, [editingMeal])

  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      if (dateFilter && meal.date !== dateFilter) {
        return false
      }

      if (typeFilter !== "all" && meal.mealType !== typeFilter) {
        return false
      }

      return true
    })
  }, [dateFilter, meals, typeFilter])

  async function submitMeal(values: MealFormValues) {
    if (!user?.uid) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const photoUrl = values.photoFile ? await uploadMealPhoto(user.uid, values.photoFile) : editingMeal?.photoUrl

      const payload = {
        date: values.date,
        time: values.time,
        mealType: values.mealType,
        description: values.description,
        notes: values.notes || undefined,
        tags: normalizeTags(values.tags),
        photoUrl,
      }

      if (editingMeal) {
        await updateMealEntry(editingMeal.id, payload)
        setEditingMeal(undefined)
      } else {
        await createMealEntry(payload)
      }

      setIsFormOpen(false)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Falha ao salvar refeicao")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Refeicoes"
        description="Area de consulta e gestao de registros, com criacao rapida quando necessario."
      />

      <MealStats meals={meals} />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Registros</span>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setIsFormOpen((prev) => !prev)}>
              <Plus className="mr-1 size-4" />
              {isFormOpen ? "Fechar formulario" : "Nova refeicao"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          <Select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as MealType | "all")}
          >
            <option value="all">Todos os tipos</option>
            {mealTypes.map((type) => (
              <option key={type} value={type}>
                {getMealTypeLabel(type)}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {isFormOpen ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>{editingMeal ? "Editar refeicao" : quickParam ? "Registro rapido" : "Nova refeicao"}</CardTitle>
          </CardHeader>
          <CardContent>
            <MealForm
              mode={quickParam ? "quick" : "full"}
              initialMeal={editingMeal}
              isSubmitting={isSubmitting}
              onSubmit={submitMeal}
              onCancel={() => {
                setEditingMeal(undefined)
                setIsFormOpen(false)
              }}
            />
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      ) : (
        <>
          <div className="lg:hidden">
            <MealList
              meals={filteredMeals}
              onEdit={(meal) => setEditingMeal(meal)}
              onDelete={(mealId) => {
                void deleteMealEntry(mealId)
                if (editingMeal?.id === mealId) {
                  setEditingMeal(undefined)
                }
              }}
            />
          </div>

          <MealRecordsTable
            meals={filteredMeals}
            onEdit={(meal) => setEditingMeal(meal)}
            onDelete={(mealId) => {
              void deleteMealEntry(mealId)
              if (editingMeal?.id === mealId) {
                setEditingMeal(undefined)
              }
            }}
          />
        </>
      )}
    </div>
  )
}
