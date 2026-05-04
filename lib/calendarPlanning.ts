import { toIsoDate } from "@/lib/date"
import type { PlanningEvent, PlanningEventType } from "@/types/planning"

export type PlanningTypeFilter = "all" | PlanningEventType

export function getMonthRange(monthValue: string) {
  const [yearValue, monthPart] = monthValue.split("-")
  const year = Number(yearValue)
  const month = Number(monthPart) - 1
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  }
}

export function filterPlanningEvents(events: PlanningEvent[], typeFilter: PlanningTypeFilter) {
  if (typeFilter === "all") {
    return events
  }

  return events.filter((event) => event.type === typeFilter)
}

export function countPlanningEventsByDate(
  events: PlanningEvent[],
  date: string,
  typeFilter: PlanningTypeFilter
) {
  return filterPlanningEvents(events, typeFilter).filter((event) => event.date === date).length
}

export function getPlanningEventsByDate(
  events: PlanningEvent[],
  date: string,
  typeFilter: PlanningTypeFilter
) {
  return filterPlanningEvents(events, typeFilter)
    .filter((event) => event.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function getUpcomingPlanningEvents(
  events: PlanningEvent[],
  referenceDate: string,
  limit = 4
) {
  return events
    .filter((event) => event.date >= referenceDate && event.status === "planned")
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) {
        return dateCompare
      }

      return a.startTime.localeCompare(b.startTime)
    })
    .slice(0, limit)
}
