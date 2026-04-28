import { getLastNDates, parseIsoDateLocal, todayIsoDate, toIsoDate } from "@/lib/date"
import type { Activity } from "@/types/activity"
import type { StreakStatus, StreakSummary } from "@/types/streak"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

const VALID_EXECUTION_STATUSES = new Set(["executed", "partial"])

function parseDate(value: string): Date {
  const date = parseIsoDateLocal(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function compareIsoDateAsc(a: string, b: string): number {
  return parseDate(a).getTime() - parseDate(b).getTime()
}

function uniqueWeekdays(days: number[]) {
  return Array.from(new Set(days.filter((day) => day >= 0 && day <= 6))).sort((a, b) => a - b)
}

function getActivePlan(plans: WorkoutPlan[]): WorkoutPlan | null {
  return plans.find((plan) => plan.status === "active") ?? null
}

function iterateDates(startDate: string, endDate: string): string[] {
  const start = parseDate(startDate)
  const end = parseDate(endDate)

  if (end.getTime() < start.getTime()) {
    return []
  }

  const dates: string[] = []
  const current = new Date(start)

  while (current.getTime() <= end.getTime()) {
    dates.push(toIsoDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function getPlannedWorkoutDays(plan: WorkoutPlan, workouts: Workout[]): number[] {
  const workoutDays = workouts
    .filter((workout) => workout.planId === plan.id && typeof workout.weekday === "number")
    .map((workout) => Number(workout.weekday))

  if (workoutDays.length > 0) {
    return uniqueWeekdays(workoutDays)
  }

  return uniqueWeekdays(plan.weekdays)
}

export function isWorkoutPlannedForDate(date: string, plan: WorkoutPlan | null, workouts: Workout[]): boolean {
  if (!plan) {
    return false
  }

  const weekday = parseDate(date).getDay()
  const plannedDays = getPlannedWorkoutDays(plan, workouts)
  return plannedDays.includes(weekday)
}

export function hasValidWorkoutExecutionForDate(date: string, executions: WorkoutExecution[]): boolean {
  return executions.some(
    (execution) =>
      execution.date === date && VALID_EXECUTION_STATUSES.has(execution.status)
  )
}

export function hasAnyActivityForDate(
  date: string,
  executions: WorkoutExecution[],
  activities: Activity[]
): boolean {
  const hasWorkoutActivity = executions.some((execution) => execution.date === date)
  const hasExtraActivity = activities.some((activity) => activity.date === date)
  return hasWorkoutActivity || hasExtraActivity
}

export function calculateStreakStatusForDate(
  date: string,
  plan: WorkoutPlan | null,
  workouts: Workout[],
  executions: WorkoutExecution[]
): StreakStatus {
  const today = todayIsoDate()
  const planned = isWorkoutPlannedForDate(date, plan, workouts)

  if (!planned) {
    return "rest_day"
  }

  if (hasValidWorkoutExecutionForDate(date, executions)) {
    return "completed"
  }

  if (date < today) {
    return "missed"
  }

  return "pending"
}

export function calculateCurrentStreak(
  plan: WorkoutPlan | null,
  workouts: Workout[],
  executions: WorkoutExecution[],
  referenceDate = todayIsoDate()
): number {
  if (!plan) {
    return 0
  }

  let streak = 0
  const cursor = parseDate(referenceDate)
  const earliestExecution = executions
    .map((execution) => execution.date)
    .sort(compareIsoDateAsc)[0]
  const fallbackStart = new Date(cursor)
  fallbackStart.setDate(cursor.getDate() - 365)
  const lowerBound = earliestExecution ?? toIsoDate(fallbackStart)

  while (toIsoDate(cursor) >= lowerBound) {
    const cursorDate = toIsoDate(cursor)
    const planned = isWorkoutPlannedForDate(cursorDate, plan, workouts)

    if (!planned) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    const completed = hasValidWorkoutExecutionForDate(cursorDate, executions)

    if (completed) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    if (cursorDate === referenceDate) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    break
  }

  return streak
}

export function calculateWeeklyStreak(
  plan: WorkoutPlan | null,
  workouts: Workout[],
  executions: WorkoutExecution[],
  referenceDate = todayIsoDate()
): Pick<StreakSummary, "weeklyCompleted" | "weeklyPlanned" | "weeklyPercentage"> {
  if (!plan) {
    return {
      weeklyCompleted: 0,
      weeklyPlanned: 0,
      weeklyPercentage: 0,
    }
  }

  const dates = getLastNDates(7, referenceDate)
  let weeklyPlanned = 0
  let weeklyCompleted = 0

  dates.forEach((date) => {
    const planned = isWorkoutPlannedForDate(date, plan, workouts)
    if (!planned) {
      return
    }

    weeklyPlanned += 1
    if (hasValidWorkoutExecutionForDate(date, executions)) {
      weeklyCompleted += 1
    }
  })

  const weeklyPercentage = weeklyPlanned > 0 ? Math.round((weeklyCompleted / weeklyPlanned) * 100) : 0
  return { weeklyCompleted, weeklyPlanned, weeklyPercentage }
}

export function calculateLongestStreak(
  plan: WorkoutPlan | null,
  workouts: Workout[],
  executions: WorkoutExecution[],
  referenceDate = todayIsoDate()
): number {
  if (!plan) {
    return 0
  }

  const executionDates = executions.map((execution) => execution.date).sort(compareIsoDateAsc)
  const fallbackStart = new Date(referenceDate)
  fallbackStart.setDate(fallbackStart.getDate() - 365)
  const startDate = executionDates[0] ?? toIsoDate(fallbackStart)
  const dates = iterateDates(startDate, referenceDate)

  let longest = 0
  let current = 0

  dates.forEach((date) => {
    const planned = isWorkoutPlannedForDate(date, plan, workouts)
    if (!planned) {
      return
    }

    if (hasValidWorkoutExecutionForDate(date, executions)) {
      current += 1
      if (current > longest) {
        longest = current
      }
      return
    }

    current = 0
  })

  return longest
}

export function calculateStreakStatusForCalendar(
  dates: string[],
  plan: WorkoutPlan | null,
  workouts: Workout[],
  executions: WorkoutExecution[]
) {
  return dates.map((date) => {
    const planned = isWorkoutPlannedForDate(date, plan, workouts)
    return {
      date,
      planned,
      status: calculateStreakStatusForDate(date, plan, workouts, executions),
    }
  })
}

export function findNextPlannedWorkoutDate(
  plan: WorkoutPlan | null,
  workouts: Workout[],
  referenceDate = todayIsoDate()
): string | undefined {
  if (!plan) {
    return undefined
  }

  const cursor = parseDate(referenceDate)
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(cursor)
    date.setDate(cursor.getDate() + offset)
    const iso = toIsoDate(date)
    if (isWorkoutPlannedForDate(iso, plan, workouts)) {
      return iso
    }
  }

  return undefined
}

export function findLastMissedDate(
  plan: WorkoutPlan | null,
  workouts: Workout[],
  executions: WorkoutExecution[],
  referenceDate = todayIsoDate()
): string | undefined {
  if (!plan) {
    return undefined
  }

  const cursor = parseDate(referenceDate)
  for (let offset = 1; offset <= 365; offset += 1) {
    const date = new Date(cursor)
    date.setDate(cursor.getDate() - offset)
    const iso = toIsoDate(date)

    if (!isWorkoutPlannedForDate(iso, plan, workouts)) {
      continue
    }

    if (!hasValidWorkoutExecutionForDate(iso, executions)) {
      return iso
    }
  }

  return undefined
}

export function calculateStreakSummary(
  plans: WorkoutPlan[],
  workouts: Workout[],
  executions: WorkoutExecution[],
  referenceDate = todayIsoDate()
): StreakSummary {
  const activePlan = getActivePlan(plans)
  const todayStatus = calculateStreakStatusForDate(referenceDate, activePlan, workouts, executions)
  const { weeklyCompleted, weeklyPlanned, weeklyPercentage } = calculateWeeklyStreak(
    activePlan,
    workouts,
    executions,
    referenceDate
  )

  return {
    currentStreak: calculateCurrentStreak(activePlan, workouts, executions, referenceDate),
    longestStreak: calculateLongestStreak(activePlan, workouts, executions, referenceDate),
    weeklyCompleted,
    weeklyPlanned,
    weeklyPercentage,
    nextPlannedWorkoutDate: findNextPlannedWorkoutDate(activePlan, workouts, referenceDate),
    todayStatus,
    lastMissedDate: findLastMissedDate(activePlan, workouts, executions, referenceDate),
  }
}
