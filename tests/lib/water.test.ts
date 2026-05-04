import { describe, expect, it } from "vitest"

import { buildWaterRangeReport, getWaterProgressStatus } from "@/lib/water"
import type { WaterLog } from "@/types/water"

function createLog(overrides: Partial<WaterLog>): WaterLog {
  return {
    id: overrides.id ?? "log-1",
    userId: overrides.userId ?? "user-1",
    date: overrides.date ?? "2026-05-01",
    amountMl: overrides.amountMl ?? 300,
    source: overrides.source ?? "manual",
    notes: overrides.notes,
    createdAt: overrides.createdAt ?? "2026-05-01T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-01T10:00:00.000Z",
  }
}

describe("getWaterProgressStatus", () => {
  it("returns completion labels and message when goal is reached", () => {
    const result = getWaterProgressStatus(2100, 2000)

    expect(result.label).toBe("Meta batida")
    expect(result.supportingLabel).toBe("Hidratacao em dia")
    expect(result.message).toBe("Meta de agua concluida hoje.")
    expect(result.remainingMl).toBe(0)
    expect(result.percentage).toBe(105)
  })

  it("returns almost-there message at 75% or more", () => {
    const result = getWaterProgressStatus(1500, 2000)

    expect(result.label).toBe("Quase la")
    expect(result.supportingLabel).toBe("Faltam 500 ml")
    expect(result.message).toBe("Quase la.")
  })

  it("returns missing-hydration message below 50%", () => {
    const result = getWaterProgressStatus(900, 2000)

    expect(result.label).toBe("Faltam 1100 ml")
    expect(result.message).toBe("Ainda falta hidratar.")
  })
})

describe("buildWaterRangeReport", () => {
  it("calculates daily average, days hitting goal and best streak", () => {
    const logs: WaterLog[] = [
      createLog({ id: "l1", date: "2026-05-01", amountMl: 1200 }),
      createLog({ id: "l2", date: "2026-05-01", amountMl: 900 }),
      createLog({ id: "l3", date: "2026-05-02", amountMl: 2000 }),
      createLog({ id: "l4", date: "2026-05-03", amountMl: 1800 }),
      createLog({ id: "l5", date: "2026-05-04", amountMl: 2200 }),
    ]

    const report = buildWaterRangeReport(logs, 2000, "2026-05-01", "2026-05-04")

    expect(report.totalDays).toBe(4)
    expect(report.dailyAverageMl).toBe(2025)
    expect(report.hitGoalDays).toBe(3)
    expect(report.bestStreakDays).toBe(2)
    expect(report.daily).toEqual([
      { date: "2026-05-01", consumedMl: 2100, hitGoal: true },
      { date: "2026-05-02", consumedMl: 2000, hitGoal: true },
      { date: "2026-05-03", consumedMl: 1800, hitGoal: false },
      { date: "2026-05-04", consumedMl: 2200, hitGoal: true },
    ])
  })

  it("fills missing days with zero consumption", () => {
    const logs: WaterLog[] = [createLog({ id: "l1", date: "2026-05-02", amountMl: 500 })]

    const report = buildWaterRangeReport(logs, 2000, "2026-05-01", "2026-05-03")

    expect(report.daily).toEqual([
      { date: "2026-05-01", consumedMl: 0, hitGoal: false },
      { date: "2026-05-02", consumedMl: 500, hitGoal: false },
      { date: "2026-05-03", consumedMl: 0, hitGoal: false },
    ])
    expect(report.dailyAverageMl).toBe(167)
    expect(report.hitGoalDays).toBe(0)
    expect(report.bestStreakDays).toBe(0)
  })
})
