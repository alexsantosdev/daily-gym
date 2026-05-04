import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"

import { todayIsoDate } from "@/lib/date"
import { assertFirebaseConfigured } from "@/lib/firebase"
import { getUserProfile, updateUserProfile } from "@/services/profileService"
import type {
  AddWaterLogInput,
  CreateOrUpdateWaterGoalInput,
  UpdateWaterLogInput,
  WaterGoal,
  WaterLog,
  WaterTodaySummary,
} from "@/types/water"

const GOALS_COLLECTION = "water_goals"
const LOGS_COLLECTION = "water_logs"
const DEFAULT_GOAL_ML = 2000

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

function normalizeGoalAmount(value: number | undefined): number {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_GOAL_ML
  }

  return Math.max(250, Math.round(value))
}

function normalizeLogAmount(value: number): number {
  if (Number.isNaN(value) || value <= 0) {
    return 0
  }

  return Math.round(value)
}

function mapWaterGoal(id: string, data: Partial<WaterGoal>): WaterGoal {
  return {
    id,
    userId: data.userId ?? "",
    dailyGoalMl: normalizeGoalAmount(data.dailyGoalMl),
    reminderEnabled: Boolean(data.reminderEnabled),
    reminderIntervalMinutes:
      typeof data.reminderIntervalMinutes === "number" ? data.reminderIntervalMinutes : 60,
    startReminderTime: data.startReminderTime ?? "08:00",
    endReminderTime: data.endReminderTime ?? "22:00",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

function mapWaterLog(id: string, data: Partial<WaterLog>): WaterLog {
  return {
    id,
    userId: data.userId ?? "",
    date: data.date ?? todayIsoDate(),
    amountMl: normalizeLogAmount(data.amountMl ?? 0),
    source: data.source,
    notes: data.notes,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

async function resolveInitialGoalMl(userId: string): Promise<number> {
  const profile = await getUserProfile(userId)
  return normalizeGoalAmount(profile?.waterIntakeGoalMl)
}

export async function getWaterGoal(userId: string): Promise<WaterGoal | null> {
  const { db } = assertFirebaseConfigured()
  const snapshot = await getDoc(doc(db, GOALS_COLLECTION, userId))

  if (!snapshot.exists()) {
    return null
  }

  return mapWaterGoal(snapshot.id, snapshot.data() as Partial<WaterGoal>)
}

export async function createOrUpdateWaterGoal(input: CreateOrUpdateWaterGoalInput): Promise<WaterGoal> {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()
  const goalRef = doc(db, GOALS_COLLECTION, input.userId)
  const existing = await getDoc(goalRef)

  const existingData = existing.exists() ? (existing.data() as Partial<WaterGoal>) : null
  const payload = stripUndefinedDeep<Omit<WaterGoal, "id">>({
    userId: input.userId,
    dailyGoalMl: normalizeGoalAmount(input.dailyGoalMl),
    reminderEnabled: input.reminderEnabled ?? existingData?.reminderEnabled ?? false,
    reminderIntervalMinutes: input.reminderIntervalMinutes ?? existingData?.reminderIntervalMinutes ?? 60,
    startReminderTime: input.startReminderTime ?? existingData?.startReminderTime ?? "08:00",
    endReminderTime: input.endReminderTime ?? existingData?.endReminderTime ?? "22:00",
    createdAt: existingData?.createdAt ?? now,
    updatedAt: now,
  })

  await setDoc(goalRef, payload)

  if (input.syncProfileGoal !== false) {
    await updateUserProfile(input.userId, { waterIntakeGoalMl: payload.dailyGoalMl })
  }

  return mapWaterGoal(input.userId, payload)
}

export async function addWaterLog(input: AddWaterLogInput): Promise<WaterLog> {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()
  const payload = stripUndefinedDeep<Omit<WaterLog, "id">>({
    userId: input.userId,
    date: input.date,
    amountMl: normalizeLogAmount(input.amountMl),
    source: input.source ?? "manual",
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  })

  const created = await addDoc(collection(db, LOGS_COLLECTION), payload)
  return mapWaterLog(created.id, payload)
}

export async function updateWaterLog(logId: string, input: UpdateWaterLogInput): Promise<void> {
  const { db } = assertFirebaseConfigured()
  const payload = stripUndefinedDeep({
    ...input,
    updatedAt: new Date().toISOString(),
  })

  await updateDoc(doc(db, LOGS_COLLECTION, logId), payload)
}

export async function deleteWaterLog(logId: string): Promise<void> {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, LOGS_COLLECTION, logId))
}

export async function getWaterLogsByDate(userId: string, date: string): Promise<WaterLog[]> {
  const { db } = assertFirebaseConfigured()
  const logsQuery = query(
    collection(db, LOGS_COLLECTION),
    where("userId", "==", userId),
    where("date", "==", date),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(logsQuery)
  return snapshot.docs.map((logDoc) => mapWaterLog(logDoc.id, logDoc.data() as Partial<WaterLog>))
}

export async function getWaterLogsByRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WaterLog[]> {
  const { db } = assertFirebaseConfigured()
  const logsQuery = query(
    collection(db, LOGS_COLLECTION),
    where("userId", "==", userId),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc"),
    orderBy("createdAt", "asc")
  )

  const snapshot = await getDocs(logsQuery)
  return snapshot.docs.map((logDoc) => mapWaterLog(logDoc.id, logDoc.data() as Partial<WaterLog>))
}

export async function getTodayWaterSummary(userId: string): Promise<WaterTodaySummary> {
  const date = todayIsoDate()
  const [goal, logs, fallbackGoalMl] = await Promise.all([
    getWaterGoal(userId),
    getWaterLogsByDate(userId, date),
    resolveInitialGoalMl(userId),
  ])

  const dailyGoalMl = normalizeGoalAmount(goal?.dailyGoalMl ?? fallbackGoalMl)
  const consumedMl = logs.reduce((sum, log) => sum + normalizeLogAmount(log.amountMl), 0)
  const remainingMl = Math.max(0, dailyGoalMl - consumedMl)
  const percentage = dailyGoalMl > 0 ? Math.min(300, Math.round((consumedMl / dailyGoalMl) * 100)) : 0

  return {
    dailyGoalMl,
    consumedMl,
    remainingMl,
    percentage,
    logs,
  }
}

export async function ensureWaterGoal(userId: string): Promise<WaterGoal> {
  const existing = await getWaterGoal(userId)
  if (existing) {
    return existing
  }

  const initialGoalMl = await resolveInitialGoalMl(userId)

  return createOrUpdateWaterGoal({
    userId,
    dailyGoalMl: initialGoalMl,
    reminderEnabled: false,
    reminderIntervalMinutes: 60,
    startReminderTime: "08:00",
    endReminderTime: "22:00",
    syncProfileGoal: false,
  })
}
