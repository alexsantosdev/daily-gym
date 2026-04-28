import { calculateStreakSummary, calculateStreakStatusForCalendar } from "@/lib/streaks"
import type { CalendarStreakStatus, StreakSummary } from "@/types/streak"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

export function getStreakSummary(
  plans: WorkoutPlan[],
  workouts: Workout[],
  executions: WorkoutExecution[],
  referenceDate?: string
): StreakSummary {
  return calculateStreakSummary(plans, workouts, executions, referenceDate)
}

export function getCalendarStreakStatuses(
  dates: string[],
  plans: WorkoutPlan[],
  workouts: Workout[],
  executions: WorkoutExecution[]
): CalendarStreakStatus[] {
  const activePlan = plans.find((plan) => plan.status === "active") ?? null
  return calculateStreakStatusForCalendar(dates, activePlan, workouts, executions)
}
