import { getLastNDates, getWeekKey, isDateInRange } from "@/lib/date"
import type { Meal } from "@/types/meal"
import type {
  DailyMealPoint,
  GeneralStats,
  GeneratedReport,
  MealReportCharts,
  MealStats,
  MuscleGroupPoint,
  ReportFilters,
  WeeklyWorkoutPoint,
  WorkoutStats,
} from "@/types/report"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

function toShortDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}

function parseLoadToNumber(load?: string): number {
  if (!load) {
    return 0
  }

  const normalized = load.replace(",", ".")
  const matched = normalized.match(/\d+(\.\d+)?/)

  return matched ? Number(matched[0]) : 0
}

function filterDataByReportRange<T extends { date: string }>(records: T[], filters: ReportFilters) {
  return records.filter((record) => isDateInRange(record.date, filters.periodStart, filters.periodEnd))
}

function buildWorkoutStats(executions: WorkoutExecution[], planned: number): WorkoutStats {
  const executed = executions.filter((execution) => execution.status === "executed").length
  const durations = executions
    .map((execution) => execution.durationMinutes ?? 0)
    .filter((duration) => duration > 0)

  const avgDuration = durations.length
    ? Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length)
    : 0

  return {
    workoutsPlanned: planned,
    workoutsExecuted: executed,
    avgDuration,
    executionRate: planned > 0 ? Math.round((executed / planned) * 100) : 0,
  }
}

function buildMealStats(meals: Meal[]): MealStats {
  const byPeriod: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  }

  const freeMealDates = new Set<string>()

  meals.forEach((meal) => {
    const hour = Number(meal.time.split(":")[0] ?? "0")

    if (hour < 12) {
      byPeriod.morning += 1
    } else if (hour < 17) {
      byPeriod.afternoon += 1
    } else if (hour < 21) {
      byPeriod.evening += 1
    } else {
      byPeriod.night += 1
    }

    if (meal.tags.some((tag) => tag.toLowerCase().includes("livre"))) {
      freeMealDates.add(meal.date)
    }
  })

  return {
    mealsCount: meals.length,
    freeMealDays: freeMealDates.size,
    byPeriod,
  }
}

function buildPlannedByWeek(filters: ReportFilters, plans: WorkoutPlan[]): Map<string, number> {
  const relevantPlans = plans.filter((plan) => {
    if (plan.status !== "active") {
      return false
    }

    if (filters.planId && filters.planId !== plan.id) {
      return false
    }

    return true
  })

  const grouped = new Map<string, number>()

  if (relevantPlans.length === 0) {
    return grouped
  }

  const start = new Date(filters.periodStart)
  const end = new Date(filters.periodEnd)

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const weekday = date.getDay()
    const plannedForDay = relevantPlans.filter((plan) => plan.weekdays.includes(weekday)).length

    if (plannedForDay === 0) {
      continue
    }

    const weekKey = getWeekKey(date.toISOString().slice(0, 10))
    grouped.set(weekKey, (grouped.get(weekKey) ?? 0) + plannedForDay)
  }

  return grouped
}

function buildWeeklyWorkoutPoints(
  executions: WorkoutExecution[],
  plannedByWeek: Map<string, number>
): WeeklyWorkoutPoint[] {
  const grouped = new Map<string, { planned: number; executed: number; durations: number[] }>()

  plannedByWeek.forEach((planned, week) => {
    grouped.set(week, {
      planned,
      executed: 0,
      durations: [],
    })
  })

  executions.forEach((execution) => {
    const key = getWeekKey(execution.date)
    const current = grouped.get(key) ?? { planned: 0, executed: 0, durations: [] }

    if (execution.status === "executed") {
      current.executed += 1
    }

    if (execution.durationMinutes && execution.durationMinutes > 0) {
      current.durations.push(execution.durationMinutes)
    }

    grouped.set(key, current)
  })

  return Array.from(grouped.entries())
    .sort(([weekA], [weekB]) => weekA.localeCompare(weekB))
    .map(([week, values]) => ({
      week,
      planned: values.planned,
      executed: values.executed,
      averageDuration: values.durations.length
        ? Math.round(values.durations.reduce((acc, item) => acc + item, 0) / values.durations.length)
        : 0,
    }))
}

function buildMealsByDayPoints(meals: Meal[], filters: ReportFilters): DailyMealPoint[] {
  const dates = getLastNDates(
    Math.max(
      1,
      Math.ceil(
        (new Date(filters.periodEnd).getTime() - new Date(filters.periodStart).getTime()) / 86400000
      ) + 1
    ),
    filters.periodEnd
  )

  return dates.map((date) => ({
    date: toShortDate(date),
    meals: meals.filter((meal) => meal.date === date).length,
  }))
}

function buildMealTypeDistribution(meals: Meal[]) {
  const grouped = new Map<string, number>()

  meals.forEach((meal) => {
    grouped.set(meal.mealType, (grouped.get(meal.mealType) ?? 0) + 1)
  })

  return Array.from(grouped.entries()).map(([type, value]) => ({ type, value }))
}

function buildMuscleDistribution(executions: WorkoutExecution[], workouts: Workout[]): MuscleGroupPoint[] {
  const workoutLookup = new Map(workouts.map((workout) => [workout.id, workout]))
  const grouped = new Map<string, number>()

  executions.forEach((execution) => {
    const workout = workoutLookup.get(execution.workoutId)

    if (!workout) {
      return
    }

    grouped.set(workout.muscleGroup, (grouped.get(workout.muscleGroup) ?? 0) + 1)
  })

  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }))
}

function buildLoadProgress(executions: WorkoutExecution[], exerciseName?: string) {
  const normalizedExercise = exerciseName?.trim().toLowerCase()

  return executions
    .flatMap((execution) =>
      execution.executedExercises
        .filter((exercise) => {
          if (!normalizedExercise) {
            return true
          }

          return exercise.exerciseName.toLowerCase().includes(normalizedExercise)
        })
        .map((exercise) => ({
          date: toShortDate(execution.date),
          load: parseLoadToNumber(exercise.loadUsed),
        }))
    )
    .filter((item) => item.load > 0)
}

function getBestWeek(weekly: WeeklyWorkoutPoint[]): string {
  if (weekly.length === 0) {
    return "Sem semana destaque"
  }

  const best = [...weekly].sort((a, b) => b.executed - a.executed)[0]
  return `${best.week} (${best.executed} treinos executados)`
}

function calculateActiveDays(meals: Meal[], executions: WorkoutExecution[]): number {
  const dates = new Set<string>()

  meals.forEach((meal) => dates.add(meal.date))
  executions.forEach((execution) => dates.add(execution.date))

  return dates.size
}

function calculateConsistencyLast7Days(meals: Meal[], executions: WorkoutExecution[]): number {
  const recentDates = getLastNDates(7)
  const withMealOrWorkout = recentDates.filter((date) => {
    const mealExists = meals.some((meal) => meal.date === date)
    const workoutExists = executions.some(
      (execution) => execution.date === date && execution.status === "executed"
    )

    return mealExists || workoutExists
  }).length

  return Math.round((withMealOrWorkout / 7) * 100)
}

function buildGeneralStats(
  workoutStats: WorkoutStats,
  mealStats: MealStats,
  weeklyPoints: WeeklyWorkoutPoint[],
  activeDays: number,
  consistencyLast7Days: number
): GeneralStats {
  const mergedConsistency = Math.round(
    (workoutStats.executionRate + consistencyLast7Days + Math.min(mealStats.mealsCount * 5, 100)) / 3
  )

  return {
    consistencyScore: Math.min(100, mergedConsistency),
    activeDays,
    bestWeek: getBestWeek(weeklyPoints),
    totalWorkouts: workoutStats.workoutsExecuted,
    totalMeals: mealStats.mealsCount,
    averageWorkoutDuration: workoutStats.avgDuration,
  }
}

function buildSummaryText(
  filters: ReportFilters,
  generalStats: GeneralStats,
  workoutStats: WorkoutStats,
  mealStats: MealStats
) {
  return [
    `Periodo de ${filters.periodStart} a ${filters.periodEnd}.`,
    `Foram ${workoutStats.workoutsExecuted} treinos executados de ${workoutStats.workoutsPlanned} planejados.`,
    `Foram registradas ${mealStats.mealsCount} refeicoes com media de ${generalStats.averageWorkoutDuration} minutos por treino.`,
    `Score de consistencia: ${generalStats.consistencyScore}%. Semana destaque: ${generalStats.bestWeek}.`,
  ].join(" ")
}

export function buildReportMetrics(
  filters: ReportFilters,
  meals: Meal[],
  executions: WorkoutExecution[],
  workouts: Workout[],
  plans: WorkoutPlan[]
): GeneratedReport {
  const filteredMeals = filterDataByReportRange(meals, filters).filter((meal) => {
    if (filters.mealType && meal.mealType !== filters.mealType) {
      return false
    }

    return true
  })

  const filteredExecutions = filterDataByReportRange(executions, filters).filter((execution) => {
    if (filters.planId && execution.planId !== filters.planId) {
      return false
    }

    return true
  })

  const filteredWorkouts = workouts.filter((workout) => {
    if (filters.planId && workout.planId !== filters.planId) {
      return false
    }

    if (filters.muscleGroup && !workout.muscleGroup.toLowerCase().includes(filters.muscleGroup.toLowerCase())) {
      return false
    }

    return true
  })

  const plannedByWeek = buildPlannedByWeek(filters, plans)
  const weeklyPoints = buildWeeklyWorkoutPoints(filteredExecutions, plannedByWeek)
  const totalPlanned = weeklyPoints.reduce((acc, item) => acc + item.planned, 0)

  const workoutStats = buildWorkoutStats(filteredExecutions, totalPlanned)
  const mealStats = buildMealStats(filteredMeals)
  const activeDays = calculateActiveDays(filteredMeals, filteredExecutions)
  const consistencyLast7Days = calculateConsistencyLast7Days(filteredMeals, filteredExecutions)

  const generalStats = buildGeneralStats(
    workoutStats,
    mealStats,
    weeklyPoints,
    activeDays,
    consistencyLast7Days
  )

  const mealCharts: MealReportCharts = {
    mealsByDay: buildMealsByDayPoints(filteredMeals, filters),
    mealTypeDistribution: buildMealTypeDistribution(filteredMeals),
    timeline: filteredMeals
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .map((meal) => ({
        date: meal.date,
        time: meal.time,
        mealType: meal.mealType,
        description: meal.description,
      })),
  }

  const workoutCharts = {
    workoutsByWeek: weeklyPoints,
    plannedVsExecuted: weeklyPoints,
    muscleGroupDistribution: buildMuscleDistribution(filteredExecutions, filteredWorkouts),
    averageDurationByWeek: weeklyPoints,
    loadProgressByExercise: buildLoadProgress(filteredExecutions, filters.exerciseName),
  }

  return {
    periodStart: filters.periodStart,
    periodEnd: filters.periodEnd,
    workoutStats,
    mealStats,
    generalStats,
    workoutCharts,
    mealCharts,
    summaryText: buildSummaryText(filters, generalStats, workoutStats, mealStats),
  }
}
