import type { MealType } from "@/types/meal"
import type { GptReportResponse } from "@/types/gpt"

export const reportTypes = ["meals", "workouts", "activities", "general"] as const
export const periodPresets = ["7d", "15d", "30d", "current_month", "custom"] as const

export type ReportType = (typeof reportTypes)[number]
export type PeriodPreset = (typeof periodPresets)[number]

export interface ReportFilters {
  userId: string
  periodPreset: PeriodPreset
  periodStart: string
  periodEnd: string
  type: ReportType
  planId?: string
  muscleGroup?: string
  exerciseName?: string
  mealType?: MealType
}

export interface WorkoutStats {
  workoutsPlanned: number
  workoutsExecuted: number
  avgDuration: number
  executionRate: number
}

export interface MealStats {
  mealsCount: number
  freeMealDays: number
  byPeriod: Record<string, number>
}

export interface ActivityStats {
  activitiesCount: number
  totalDuration: number
  avgDuration: number
  totalDistanceKm: number
}

export interface GeneralStats {
  consistencyScore: number
  activeDays: number
  bestWeek: string
  totalWorkouts: number
  totalActivities: number
  totalMeals: number
  averageWorkoutDuration: number
}

export interface WeeklyWorkoutPoint {
  week: string
  planned: number
  executed: number
  averageDuration: number
}

export interface DailyMealPoint {
  date: string
  meals: number
}

export interface MuscleGroupPoint {
  name: string
  value: number
}

export interface MealTypePoint {
  type: string
  value: number
}

export interface LoadProgressPoint {
  date: string
  load: number
}

export interface DailyActivityPoint {
  date: string
  activities: number
}

export interface WeeklyActivityPoint {
  week: string
  activities: number
  averageDuration: number
}

export interface ActivityTypePoint {
  type: string
  value: number
}

export interface ActivityDistancePoint {
  date: string
  distanceKm: number
}

export interface MealTimelineItem {
  date: string
  time: string
  mealType: MealType
  description: string
}

export interface WorkoutReportCharts {
  workoutsByWeek: WeeklyWorkoutPoint[]
  plannedVsExecuted: WeeklyWorkoutPoint[]
  muscleGroupDistribution: MuscleGroupPoint[]
  averageDurationByWeek: WeeklyWorkoutPoint[]
  loadProgressByExercise: LoadProgressPoint[]
}

export interface MealReportCharts {
  mealsByDay: DailyMealPoint[]
  mealTypeDistribution: MealTypePoint[]
  timeline: MealTimelineItem[]
}

export interface ActivityReportCharts {
  activitiesByDay: DailyActivityPoint[]
  activitiesByWeek: WeeklyActivityPoint[]
  activityTypeDistribution: ActivityTypePoint[]
  distanceByDay: ActivityDistancePoint[]
}

export interface GeneratedReport {
  periodStart: string
  periodEnd: string
  workoutStats: WorkoutStats
  activityStats: ActivityStats
  mealStats: MealStats
  generalStats: GeneralStats
  workoutCharts: WorkoutReportCharts
  activityCharts: ActivityReportCharts
  mealCharts: MealReportCharts
  summaryText: string
}

export interface PersistedReport {
  id: string
  userId: string
  type: ReportType
  periodStart: string
  periodEnd: string
  generatedSummary: string
  reportData: GeneratedReport
  filters: ReportFilters
  gptAnalysis?: GptReportResponse
  createdAt: string
}

export interface SaveReportInput {
  userId: string
  type: ReportType
  filters: ReportFilters
  reportData: GeneratedReport
  gptAnalysis?: GptReportResponse
}
