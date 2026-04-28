export interface GptReportPayload {
  userGoal?: string
  periodStart: string
  periodEnd: string
  mealsSummary: string[]
  workoutsSummary: string[]
  consistencyMetrics: {
    score: number
    activeDays: number
    mealsCount: number
    workoutsExecuted: number
  }
  observations?: string
}

export interface GptReportResponse {
  summary: string
  strengths: string[]
  attentionPoints: string[]
  suggestions: string[]
  nextWeekFocus: string[]
  consistencyScore: number
  generatedAt: string
  source: "mock" | "openai"
}

export interface GptRouteResult {
  analysis: GptReportResponse
}
