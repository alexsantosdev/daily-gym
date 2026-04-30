import type { ActivityType } from "@/types/activity"
import type { MealType } from "@/types/meal"

export const planningEventTypes = ["meal", "workout", "activity"] as const
export const planningRecurrenceOptions = ["none", "daily", "weekly", "monthly"] as const
export const planningEventStatuses = ["planned", "completed", "skipped"] as const

export type PlanningEventType = (typeof planningEventTypes)[number]
export type PlanningRecurrence = (typeof planningRecurrenceOptions)[number]
export type PlanningEventStatus = (typeof planningEventStatuses)[number]

export interface PlanningEvent {
  id: string
  userId: string
  title: string
  type: PlanningEventType
  date: string
  startTime: string
  endTime?: string
  recurrence?: PlanningRecurrence
  weekdays?: number[]
  relatedWorkoutId?: string
  relatedWorkoutPlanId?: string
  mealType?: MealType
  activityType?: ActivityType | "run" | "zumba" | "other"
  notes?: string
  status: PlanningEventStatus
  createdAt: string
  updatedAt: string
}

export interface PlanningDateRange {
  start?: string
  end?: string
}

export interface CreatePlanningEventInput {
  userId: string
  title: string
  type: PlanningEventType
  date: string
  startTime: string
  endTime?: string
  recurrence?: PlanningRecurrence
  weekdays?: number[]
  relatedWorkoutId?: string
  relatedWorkoutPlanId?: string
  mealType?: MealType
  activityType?: ActivityType | "run" | "zumba" | "other"
  notes?: string
  status?: PlanningEventStatus
}

export interface UpdatePlanningEventInput {
  title?: string
  type?: PlanningEventType
  date?: string
  startTime?: string
  endTime?: string
  recurrence?: PlanningRecurrence
  weekdays?: number[]
  relatedWorkoutId?: string
  relatedWorkoutPlanId?: string
  mealType?: MealType
  activityType?: ActivityType | "run" | "zumba" | "other"
  notes?: string
  status?: PlanningEventStatus
}

