import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore"

import { assertFirebaseConfigured } from "@/lib/firebase"
import { isDateInRange } from "@/lib/date"
import type {
  CreatePlanningEventInput,
  PlanningDateRange,
  PlanningEvent,
  UpdatePlanningEventInput,
} from "@/types/planning"

const COLLECTION_NAME = "planningEvents"

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined)
      .map(([key, itemValue]) => [key, stripUndefinedDeep(itemValue)])
    return Object.fromEntries(entries) as T
  }

  return value
}

function mapPlanningEvent(id: string, data: Partial<PlanningEvent>): PlanningEvent {
  return {
    id,
    userId: data.userId ?? "",
    title: data.title ?? "",
    type: data.type ?? "activity",
    date: data.date ?? "",
    startTime: data.startTime ?? "00:00",
    endTime: data.endTime,
    recurrence: data.recurrence ?? "none",
    weekdays: data.weekdays ?? [],
    relatedWorkoutId: data.relatedWorkoutId,
    relatedWorkoutPlanId: data.relatedWorkoutPlanId,
    mealType: data.mealType,
    activityType: data.activityType,
    notes: data.notes,
    status: data.status ?? "planned",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

function sortPlanningEvents(events: PlanningEvent[]) {
  return [...events].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) {
      return dateCompare
    }

    const startCompare = a.startTime.localeCompare(b.startTime)
    if (startCompare !== 0) {
      return startCompare
    }

    return b.createdAt.localeCompare(a.createdAt)
  })
}

export async function createPlanningEvent(input: CreatePlanningEventInput) {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()

  const payload: Omit<PlanningEvent, "id"> = {
    userId: input.userId,
    title: input.title.trim(),
    type: input.type,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    recurrence: input.recurrence ?? "none",
    weekdays: input.weekdays ?? [],
    relatedWorkoutId: input.relatedWorkoutId,
    relatedWorkoutPlanId: input.relatedWorkoutPlanId,
    mealType: input.mealType,
    activityType: input.activityType,
    notes: input.notes?.trim() || undefined,
    status: input.status ?? "planned",
    createdAt: now,
    updatedAt: now,
  }

  const sanitized = stripUndefinedDeep(payload)
  const created = await addDoc(collection(db, COLLECTION_NAME), sanitized)
  return mapPlanningEvent(created.id, sanitized)
}

export async function updatePlanningEvent(
  planningEventId: string,
  input: UpdatePlanningEventInput
) {
  const { db } = assertFirebaseConfigured()
  const payload = stripUndefinedDeep({
    ...input,
    title: input.title?.trim(),
    notes: input.notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  })

  await updateDoc(doc(db, COLLECTION_NAME, planningEventId), payload)
}

export async function deletePlanningEvent(planningEventId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, planningEventId))
}

export async function getPlanningEventsByUser(userId: string, range?: PlanningDateRange) {
  const { db } = assertFirebaseConfigured()
  const eventsQuery = query(collection(db, COLLECTION_NAME), where("userId", "==", userId))
  const snapshot = await getDocs(eventsQuery)
  const mapped = snapshot.docs.map((item) =>
    mapPlanningEvent(item.id, item.data() as Partial<PlanningEvent>)
  )

  const filtered = range?.start && range?.end
    ? mapped.filter((item) => isDateInRange(item.date, range.start as string, range.end as string))
    : mapped

  return sortPlanningEvents(filtered)
}

export async function getPlanningEventsByDate(userId: string, date: string) {
  const { db } = assertFirebaseConfigured()
  const eventsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    where("date", "==", date)
  )
  const snapshot = await getDocs(eventsQuery)
  return sortPlanningEvents(
    snapshot.docs.map((item) => mapPlanningEvent(item.id, item.data() as Partial<PlanningEvent>))
  )
}

export async function markPlanningEventCompleted(planningEventId: string) {
  return updatePlanningEvent(planningEventId, { status: "completed" })
}

export async function markPlanningEventSkipped(planningEventId: string) {
  return updatePlanningEvent(planningEventId, { status: "skipped" })
}

