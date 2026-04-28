export function toIsoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}

export function todayIsoDate(): string {
  return toIsoDate(new Date())
}

export function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toIsoDate(date)
}

export function getDateRangeFromPreset(
  preset: "7d" | "15d" | "30d" | "current_month" | "custom",
  customStart?: string,
  customEnd?: string
) {
  const end = new Date()

  if (preset === "custom") {
    return {
      periodStart: customStart ?? toIsoDate(end),
      periodEnd: customEnd ?? toIsoDate(end),
    }
  }

  if (preset === "current_month") {
    const start = new Date(end.getFullYear(), end.getMonth(), 1)
    return {
      periodStart: toIsoDate(start),
      periodEnd: toIsoDate(end),
    }
  }

  const days = preset === "7d" ? 7 : preset === "15d" ? 15 : 30
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))

  return {
    periodStart: toIsoDate(start),
    periodEnd: toIsoDate(end),
  }
}

export function getLastNDates(days: number, endDate = todayIsoDate()): string[] {
  const end = new Date(endDate)
  const output: string[] = []

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(end)
    date.setDate(end.getDate() - index)
    output.push(toIsoDate(date))
  }

  return output
}

export function isDateInRange(targetDate: string, periodStart: string, periodEnd: string): boolean {
  const value = new Date(targetDate).getTime()
  const start = new Date(periodStart).getTime()
  const end = new Date(periodEnd).getTime()

  return value >= start && value <= end
}

export function minutesBetween(startedAt?: string, finishedAt?: string): number {
  if (!startedAt || !finishedAt) {
    return 0
  }

  const start = new Date(startedAt).getTime()
  const end = new Date(finishedAt).getTime()

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0
  }

  return Math.max(1, Math.round((end - start) / 60000))
}

export function getWeekKey(inputDate: string): string {
  const date = new Date(inputDate)
  const firstDay = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((date.getTime() - firstDay.getTime()) / 86400000)
  const week = Math.ceil((dayOfYear + firstDay.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`
}

export const weekdayLabels = [
  "Domingo",
  "Segunda-feira",
  "Terca-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sabado",
] as const

export function getTodayWeekday(): number {
  return new Date().getDay()
}

export function getWeekdayLabel(day: number): string {
  return weekdayLabels[day] ?? `Dia ${day}`
}

export function getWeekdayShortLabel(day: number): string {
  const label = getWeekdayLabel(day)
  return label.replace("-feira", "")
}

export function formatDatePtBr(value?: string): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function formatTimePtBr(value?: string): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}

export function formatDateTimePtBr(value?: string): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatWeekdayDatePtBr(value?: string): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}
