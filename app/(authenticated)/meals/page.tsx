"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Plus, X } from "@phosphor-icons/react"

import { PageHeader } from "@/components/layout/page-header"
import { MealForm, type MealFormValues } from "@/components/meals/meal-form"
import { MealList } from "@/components/meals/meal-list"
import { MealRecordsTable } from "@/components/meals/MealRecordsTable"
import { MealStats } from "@/components/meals/MealStats"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useMeals } from "@/hooks/useMeals"
import { getMealTypeLabel } from "@/lib/labels"
import { uploadMealPhoto } from "@/services/mealService"
import { markPlanningEventCompleted } from "@/services/planningService"
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
  const plannedEventId = searchParams.get("plannedEventId")

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
        if (plannedEventId) {
          await markPlanningEventCompleted(plannedEventId)
        }
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
      <PageHeader title="Refeicoes" description="Registre e acompanhe suas refeicoes com foco em uso rapido no celular." />

      <MealStats meals={meals} />

      <section className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Filtre por data e tipo para consultar seus registros.</p>
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-1 size-4" />
            Nova refeicao
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as MealType | "all")}>
            <option value="all">Todos os tipos</option>
            {mealTypes.map((type) => (
              <option key={type} value={type}>
                {getMealTypeLabel(type)}
              </option>
            ))}
          </Select>
        </div>
      </section>

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

      {isFormOpen ? (
        <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-[100dvh] w-full max-w-2xl flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <p className="text-sm font-semibold">{editingMeal ? "Editar refeicao" : quickParam ? "Registro rapido" : "Nova refeicao"}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setEditingMeal(undefined)
                  setIsFormOpen(false)
                }}
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Card className="border-border/70">
                <CardContent className="pt-4">
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
