import type { GeneratedReport } from "@/types/report"

export interface CalendarOverviewMetric {
  title: string
  value: string | number
  subtitle: string
  progress: number
}

export function buildCalendarOverviewMetrics({
  report,
  mealsTodayCount,
}: {
  report: GeneratedReport | null
  mealsTodayCount: number
}): CalendarOverviewMetric[] {
  const workoutsExecuted = report?.workoutStats.workoutsExecuted ?? 0
  const workoutsPlanned = report?.workoutStats.workoutsPlanned ?? 0
  const executionRate = report?.workoutStats.executionRate ?? 0
  const consistencyScore = report?.generalStats.consistencyScore ?? 0

  return [
    {
      title: "Treinos executados",
      value: workoutsExecuted,
      subtitle: "Ultimos 7 dias",
      progress: executionRate,
    },
    {
      title: "Planejados x executados",
      value: `${workoutsExecuted}/${workoutsPlanned}`,
      subtitle: "Meta semanal",
      progress: executionRate,
    },
    {
      title: "Refeicoes hoje",
      value: mealsTodayCount,
      subtitle: "No dia atual",
      progress: Math.min(100, mealsTodayCount * 25),
    },
    {
      title: "Consistencia",
      value: `${consistencyScore}%`,
      subtitle: "Ultimos 7 dias",
      progress: consistencyScore,
    },
  ]
}
