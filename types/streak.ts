export const streakStatuses = ["completed", "missed", "rest_day", "pending"] as const

export type StreakStatus = (typeof streakStatuses)[number]

export interface StreakSummary {
  currentStreak: number
  longestStreak: number
  weeklyCompleted: number
  weeklyPlanned: number
  weeklyPercentage: number
  nextPlannedWorkoutDate?: string
  todayStatus: StreakStatus
  lastMissedDate?: string
}

export interface CalendarStreakStatus {
  date: string
  status: StreakStatus
  planned: boolean
}
