export const mealTypes = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "pre_workout",
  "post_workout",
  "other",
] as const

export type MealType = (typeof mealTypes)[number]

export interface MacroEstimate {
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
}

export interface Meal {
  id: string
  userId: string
  date: string
  time: string
  mealType: MealType
  description: string
  photoUrl?: string
  notes?: string
  tags: string[]
  estimatedMacros?: MacroEstimate
  createdAt: string
  updatedAt: string
}

export interface CreateMealInput {
  userId: string
  date: string
  time: string
  mealType: MealType
  description: string
  photoUrl?: string
  notes?: string
  tags?: string[]
  estimatedMacros?: MacroEstimate
}

export interface UpdateMealInput {
  date?: string
  time?: string
  mealType?: MealType
  description?: string
  photoUrl?: string
  notes?: string
  tags?: string[]
  estimatedMacros?: MacroEstimate
}
