import { buildReportMetrics } from "@/lib/reportMetrics"
import type { Meal } from "@/types/meal"
import type { GptReportPayload, GptReportResponse } from "@/types/gpt"
import type { GeneratedReport, ReportFilters } from "@/types/report"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

export async function generateReportBundle(
  filters: ReportFilters,
  meals: Meal[],
  workoutExecutions: WorkoutExecution[],
  workouts: Workout[],
  plans: WorkoutPlan[]
): Promise<GeneratedReport> {
  return buildReportMetrics(filters, meals, workoutExecutions, workouts, plans)
}

export async function requestGptInsight(payload: GptReportPayload): Promise<GptReportResponse> {
  const response = await fetch("/api/gpt-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error("Falha ao solicitar analise IA")
  }

  const data = (await response.json()) as { analysis: GptReportResponse }
  return data.analysis
}
