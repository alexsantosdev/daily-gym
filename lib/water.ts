import { parseIsoDateLocal, toIsoDate } from "@/lib/date"
import type { WaterDailyConsumption, WaterLog, WaterRangeReport } from "@/types/water"

function normalizeAmount(value: number) {
  if (!value || Number.isNaN(value)) {
    return 0
  }

  return Math.max(0, Math.round(value))
}

export function getWaterProgressStatus(consumedMl: number, dailyGoalMl: number) {
  const safeGoal = Math.max(1, normalizeAmount(dailyGoalMl))
  const consumed = normalizeAmount(consumedMl)
  const remainingMl = Math.max(0, safeGoal - consumed)
  const percentage = Math.round((consumed / safeGoal) * 100)

  if (percentage >= 100) {
    return {
      label: "Meta batida",
      supportingLabel: "Hidratacao em dia",
      message: "Meta de agua concluida hoje.",
      remainingMl,
      percentage,
    }
  }

  if (percentage >= 75) {
    return {
      label: "Quase la",
      supportingLabel: `Faltam ${remainingMl} ml`,
      message: "Quase la.",
      remainingMl,
      percentage,
    }
  }

  if (percentage < 50) {
    return {
      label: `Faltam ${remainingMl} ml`,
      supportingLabel: "Hidratacao em dia",
      message: "Ainda falta hidratar.",
      remainingMl,
      percentage,
    }
  }

  return {
    label: `Faltam ${remainingMl} ml`,
    supportingLabel: "Hidratacao em dia",
    message: "Hidratacao em dia.",
    remainingMl,
    percentage,
  }
}

function getDatesBetween(startDate: string, endDate: string): string[] {
  const start = parseIsoDateLocal(startDate)
  const end = parseIsoDateLocal(endDate)
  const output: string[] = []

  if (start.getTime() > end.getTime()) {
    return output
  }

  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    output.push(toIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return output
}

export function buildWaterRangeReport(
  logs: WaterLog[],
  dailyGoalMl: number,
  startDate: string,
  endDate: string
): WaterRangeReport {
  const goal = Math.max(1, normalizeAmount(dailyGoalMl))
  const dates = getDatesBetween(startDate, endDate)
  const consumedByDate = new Map<string, number>()

  logs.forEach((log) => {
    consumedByDate.set(log.date, (consumedByDate.get(log.date) ?? 0) + normalizeAmount(log.amountMl))
  })

  const daily: WaterDailyConsumption[] = dates.map((date) => {
    const consumedMl = consumedByDate.get(date) ?? 0
    return {
      date,
      consumedMl,
      hitGoal: consumedMl >= goal,
    }
  })

  let hitGoalDays = 0
  let currentStreak = 0
  let bestStreakDays = 0
  let totalConsumed = 0

  daily.forEach((item) => {
    totalConsumed += item.consumedMl
    if (item.hitGoal) {
      hitGoalDays += 1
      currentStreak += 1
      bestStreakDays = Math.max(bestStreakDays, currentStreak)
      return
    }

    currentStreak = 0
  })

  const totalDays = daily.length

  return {
    dailyAverageMl: totalDays > 0 ? Math.round(totalConsumed / totalDays) : 0,
    hitGoalDays,
    bestStreakDays,
    totalDays,
    daily,
  }
}
