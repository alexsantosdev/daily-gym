import { expect, test } from "@playwright/test"

const userContext = {
  userId: "playwright-user",
  profile: {
    displayName: "Playwright User",
    goal: "hypertrophy",
  },
  activePlan: {
    weekdays: [1, 3, 5],
  },
  stats: {
    workoutsThisWeek: 2,
    mealsToday: 3,
    waterProgressPercent: 75,
  },
}

const gptReportPayload = {
  periodStart: "2026-05-01",
  periodEnd: "2026-05-05",
  mealsSummary: ["Breakfast with protein", "Lunch with vegetables"],
  workoutsSummary: ["Upper body completed", "Walk completed"],
  consistencyMetrics: {
    score: 87,
    activeDays: 4,
    mealsCount: 8,
    workoutsExecuted: 2,
  },
}

const workoutSharePayload = {
  workoutExecution: {
    id: "execution-1",
    userId: "playwright-user",
    planId: "plan-1",
    workoutId: "workout-1",
    date: "2026-05-05",
    startedAt: "2026-05-05T10:00:00.000Z",
    finishedAt: "2026-05-05T10:45:00.000Z",
    durationMinutes: 45,
    status: "executed",
    checkinType: "manual",
    executedExercises: [
      {
        exerciseName: "Supino com halteres",
        setsCompleted: 4,
        repsCompleted: 40,
        loadUsed: "24kg",
        completed: true,
      },
      {
        exerciseName: "Remada sentada",
        setsCompleted: 3,
        repsCompleted: 36,
        loadUsed: "35kg",
        completed: true,
      },
    ],
    createdAt: "2026-05-05T10:00:00.000Z",
    updatedAt: "2026-05-05T10:45:00.000Z",
  },
  workout: {
    id: "workout-1",
    userId: "playwright-user",
    planId: "plan-1",
    name: "Treino A",
    muscleGroup: "Peito e costas",
    weekday: 2,
    exercises: [
      {
        name: "Supino com halteres",
        muscleGroup: "Peito",
        sets: 4,
        reps: "10",
      },
      {
        name: "Remada sentada",
        muscleGroup: "Costas",
        sets: 3,
        reps: "12",
      },
    ],
    order: 1,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
  },
  workoutPlan: {
    id: "plan-1",
    userId: "playwright-user",
    name: "Plano Playwright",
    goal: "hypertrophy",
    weekdays: [1, 3, 5],
    workoutIds: ["workout-1"],
    status: "active",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
  },
  userProfile: {
    displayName: "Playwright User",
    weightKg: 82,
    goal: "hypertrophy",
  },
  streakSummary: {
    currentStreak: 4,
    weeklyPercentage: 80,
    todayStatus: "completed",
  },
}

test.describe("AI API contracts @api @contract", () => {
  test("rejects invalid Personal AI payloads @negative", async ({ request }) => {
    const response = await request.post("/api/personal-ai", {
      data: { type: "unknown", context: {} },
    })

    expect(response.status()).toBe(400)
    await expect(response).not.toBeOK()
    expect(await response.json()).toMatchObject({
      error: "Payload invalido para Personal IA.",
    })
  })

  test("returns mock Personal AI recommendation without an OpenAI key @critical", async ({
    request,
  }) => {
    const response = await request.post("/api/personal-ai", {
      data: {
        type: "workout_plan",
        context: userContext,
      },
    })

    await expect(response).toBeOK()
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()
    expect(body).toMatchObject({
      source: "mock",
      recommendation: {
        type: "workout_plan",
      },
    })
    expect(body.recommendation.title).toEqual(expect.any(String))
    expect(body.recommendation.payload.plan.weekdays).toEqual([1, 3, 5])
  })

  test("rejects invalid GPT report payloads @negative", async ({ request }) => {
    const response = await request.post("/api/gpt-report", {
      data: { periodStart: "2026-05-01" },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      error: "Payload invalido para geracao de analise",
    })
  })

  test("returns mock GPT report analysis without an OpenAI key", async ({
    request,
  }) => {
    const response = await request.post("/api/gpt-report", {
      data: gptReportPayload,
    })

    await expect(response).toBeOK()
    const body = await response.json()

    expect(body.analysis).toMatchObject({
      source: "mock",
      consistencyScore: 87,
    })
    expect(body.analysis.summary).toEqual(expect.any(String))
    expect(body.analysis.suggestions).toEqual(expect.any(Array))
  })

  test("rejects invalid workout share payloads @negative", async ({
    request,
  }) => {
    const response = await request.post("/api/workout-share-analysis", {
      data: { workoutExecution: {}, workout: {} },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      error: "Payload invalido para analise de treino.",
    })
  })

  test("returns local workout share analysis without an OpenAI key", async ({
    request,
  }) => {
    const response = await request.post("/api/workout-share-analysis", {
      data: workoutSharePayload,
    })

    await expect(response).toBeOK()
    const body = await response.json()

    expect(body.analysis).toMatchObject({
      ctaText: "feito com daily-gym",
      visualMood: expect.any(String),
    })
    expect(body.analysis.headline).toEqual(expect.any(String))
    expect(body.analysis.estimatedCalories).toEqual(expect.any(Number))
    expect(body.analysis.hashtags).toContain("#dailygym")
  })
})
