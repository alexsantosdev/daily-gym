export const waterLogSources = ["manual", "quick_action", "reminder"] as const

export type WaterLogSource = (typeof waterLogSources)[number]

export interface WaterGoal {
  id: string
  userId: string
  dailyGoalMl: number
  reminderEnabled: boolean
  reminderIntervalMinutes: number
  startReminderTime: string
  endReminderTime: string
  createdAt: string
  updatedAt: string
}

export interface WaterLog {
  id: string
  userId: string
  date: string
  amountMl: number
  source?: WaterLogSource
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateOrUpdateWaterGoalInput {
  userId: string
  dailyGoalMl: number
  reminderEnabled?: boolean
  reminderIntervalMinutes?: number
  startReminderTime?: string
  endReminderTime?: string
  syncProfileGoal?: boolean
}

export interface AddWaterLogInput {
  userId: string
  date: string
  amountMl: number
  source?: WaterLogSource
  notes?: string
}

export interface UpdateWaterLogInput {
  date?: string
  amountMl?: number
  source?: WaterLogSource
  notes?: string
}

export interface WaterTodaySummary {
  dailyGoalMl: number
  consumedMl: number
  remainingMl: number
  percentage: number
  logs: WaterLog[]
}

export interface WaterDailyConsumption {
  date: string
  consumedMl: number
  hitGoal: boolean
}

export interface WaterRangeReport {
  dailyAverageMl: number
  hitGoalDays: number
  bestStreakDays: number
  totalDays: number
  daily: WaterDailyConsumption[]
}
