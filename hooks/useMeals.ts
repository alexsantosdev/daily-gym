"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  createMeal,
  deleteMeal,
  listMealsByUser,
  updateMeal,
} from "@/services/mealService"
import type { CreateMealInput, Meal, UpdateMealInput } from "@/types/meal"

export function useMeals(userId?: string) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) {
      setMeals([])
      return
    }

    setIsLoading(true)

    try {
      const records = await listMealsByUser(userId)
      setMeals(records)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createMealEntry = useCallback(
    async (input: Omit<CreateMealInput, "userId">) => {
      if (!userId) {
        return
      }

      await createMeal({ ...input, userId })
      await refresh()
    },
    [refresh, userId]
  )

  const updateMealEntry = useCallback(
    async (mealId: string, input: UpdateMealInput) => {
      if (!userId) {
        return
      }

      await updateMeal(mealId, userId, input)
      await refresh()
    },
    [refresh, userId]
  )

  const deleteMealEntry = useCallback(
    async (mealId: string) => {
      await deleteMeal(mealId)
      await refresh()
    },
    [refresh]
  )

  return useMemo(
    () => ({
      meals,
      isLoading,
      refresh,
      createMealEntry,
      updateMealEntry,
      deleteMealEntry,
    }),
    [createMealEntry, deleteMealEntry, isLoading, meals, refresh, updateMealEntry]
  )
}
