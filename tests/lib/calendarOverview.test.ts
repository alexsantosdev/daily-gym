import { describe, expect, it } from "vitest"

import { buildCalendarOverviewMetrics } from "@/lib/calendarOverview"
import type { GeneratedReport } from "@/types/report"

function createReport(
  overrides: Partial<GeneratedReport> = {}
): GeneratedReport {
  return {
    periodStart: "2026-04-28",
    periodEnd: "2026-05-04",
    workoutStats: {
      workoutsPlanned: 5,
      workoutsExecuted: 3,
      avgDuration: 45,
      executionRate: 60,
    },
    activityStats: {
      activitiesCount: 2,
      totalDuration: 90,
      avgDuration: 45,
      totalDistanceKm: 5,
    },
    mealStats: {
      mealsCount: 12,
      freeMealDays: 1,
      byPeriod: {},
    },
    generalStats: {
      consistencyScore: 72,
      activeDays: 4,
      bestWeek: "2026-W18",
      totalWorkouts: 3,
      totalActivities: 2,
      totalMeals: 12,
      averageWorkoutDuration: 45,
    },
    workoutCharts: {
      workoutsByWeek: [],
      plannedVsExecuted: [],
      muscleGroupDistribution: [],
      averageDurationByWeek: [],
      loadProgressByExercise: [],
    },
    activityCharts: {
      activitiesByDay: [],
      activitiesByWeek: [],
      activityTypeDistribution: [],
      distanceByDay: [],
    },
    mealCharts: {
      mealsByDay: [],
      mealTypeDistribution: [],
      timeline: [],
    },
    summaryText: "Resumo",
    ...overrides,
  }
}

describe("buildCalendarOverviewMetrics", () => {
  it("returns the migrated dashboard metrics for the calendar overview", () => {
    const metrics = buildCalendarOverviewMetrics({
      report: createReport(),
      mealsTodayCount: 2,
    })

    expect(metrics).toEqual([
      {
        title: "Treinos executados",
        value: 3,
        subtitle: "Ultimos 7 dias",
        progress: 60,
      },
      {
        title: "Planejados x executados",
        value: "3/5",
        subtitle: "Meta semanal",
        progress: 60,
      },
      {
        title: "Refeicoes hoje",
        value: 2,
        subtitle: "No dia atual",
        progress: 50,
      },
      {
        title: "Consistencia",
        value: "72%",
        subtitle: "Ultimos 7 dias",
        progress: 72,
      },
    ])
  })

  it("keeps stable fallback values while the report is loading", () => {
    const metrics = buildCalendarOverviewMetrics({
      report: null,
      mealsTodayCount: 1,
    })

    expect(metrics.map((metric) => metric.value)).toEqual([0, "0/0", 1, "0%"])
    expect(metrics.map((metric) => metric.progress)).toEqual([0, 0, 25, 0])
  })
})
