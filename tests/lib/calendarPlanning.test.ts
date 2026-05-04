import { describe, expect, it } from "vitest"

import {
  countPlanningEventsByDate,
  filterPlanningEvents,
  getMonthRange,
  getUpcomingPlanningEvents,
} from "@/lib/calendarPlanning"
import type { PlanningEvent } from "@/types/planning"

function createEvent(overrides: Partial<PlanningEvent>): PlanningEvent {
  return {
    id: overrides.id ?? "event-1",
    userId: overrides.userId ?? "user-1",
    title: overrides.title ?? "Evento",
    type: overrides.type ?? "meal",
    date: overrides.date ?? "2026-05-01",
    startTime: overrides.startTime ?? "07:00",
    endTime: overrides.endTime,
    recurrence: overrides.recurrence ?? "none",
    weekdays: overrides.weekdays ?? [],
    relatedWorkoutId: overrides.relatedWorkoutId,
    relatedWorkoutPlanId: overrides.relatedWorkoutPlanId,
    mealType: overrides.mealType,
    activityType: overrides.activityType,
    notes: overrides.notes,
    status: overrides.status ?? "planned",
    createdAt: overrides.createdAt ?? "2026-05-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-01T00:00:00.000Z",
  }
}

describe("getMonthRange", () => {
  it("returns first and last day for given month", () => {
    expect(getMonthRange("2026-05")).toEqual({
      start: "2026-05-01",
      end: "2026-05-31",
    })
  })
})

describe("filterPlanningEvents", () => {
  it("filters planning events by type", () => {
    const events = [
      createEvent({ id: "meal", type: "meal" }),
      createEvent({ id: "workout", type: "workout" }),
      createEvent({ id: "activity", type: "activity" }),
    ]

    expect(filterPlanningEvents(events, "workout").map((item) => item.id)).toEqual(["workout"])
    expect(filterPlanningEvents(events, "all")).toHaveLength(3)
  })
})

describe("countPlanningEventsByDate", () => {
  it("counts events by date respecting type filter", () => {
    const events = [
      createEvent({ id: "1", type: "meal", date: "2026-05-04" }),
      createEvent({ id: "2", type: "workout", date: "2026-05-04" }),
      createEvent({ id: "3", type: "workout", date: "2026-05-05" }),
    ]

    expect(countPlanningEventsByDate(events, "2026-05-04", "all")).toBe(2)
    expect(countPlanningEventsByDate(events, "2026-05-04", "workout")).toBe(1)
  })
})

describe("getUpcomingPlanningEvents", () => {
  it("returns only planned upcoming events sorted by date and time", () => {
    const events = [
      createEvent({ id: "past", date: "2026-05-03", startTime: "09:00", status: "planned" }),
      createEvent({ id: "done", date: "2026-05-04", startTime: "06:00", status: "completed" }),
      createEvent({ id: "b", date: "2026-05-04", startTime: "08:00", status: "planned" }),
      createEvent({ id: "a", date: "2026-05-04", startTime: "07:00", status: "planned" }),
      createEvent({ id: "c", date: "2026-05-06", startTime: "07:00", status: "planned" }),
    ]

    const result = getUpcomingPlanningEvents(events, "2026-05-04")
    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"])
  })
})
