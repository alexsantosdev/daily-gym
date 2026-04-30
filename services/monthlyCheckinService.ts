import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import { assertFirebaseConfigured } from "@/lib/firebase"
import { buildImageFileName, uploadImageWithFallbackPaths } from "@/lib/storageUpload"
import type {
  CreateMonthlyCheckinInput,
  UpdateMonthlyCheckinInput,
  UserMonthlyCheckin,
} from "@/types/profile"

const COLLECTION_NAME = "monthlyCheckins"

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

function mapMonthlyCheckin(id: string, data: Partial<UserMonthlyCheckin>): UserMonthlyCheckin {
  return {
    id,
    userId: data.userId ?? "",
    month: Number(data.month ?? 1),
    year: Number(data.year ?? 1970),
    weightKg: Number(data.weightKg ?? 0),
    waistCm: typeof data.waistCm === "number" ? Number(data.waistCm) : undefined,
    chestCm: typeof data.chestCm === "number" ? Number(data.chestCm) : undefined,
    hipCm: typeof data.hipCm === "number" ? Number(data.hipCm) : undefined,
    armCm: typeof data.armCm === "number" ? Number(data.armCm) : undefined,
    thighCm: typeof data.thighCm === "number" ? Number(data.thighCm) : undefined,
    bodyFatPercentage:
      typeof data.bodyFatPercentage === "number" ? Number(data.bodyFatPercentage) : undefined,
    progressPhotoUrl: data.progressPhotoUrl,
    mood: data.mood,
    energyLevel: data.energyLevel,
    sleepQuality: data.sleepQuality,
    adherenceNote: data.adherenceNote,
    objectiveUpdate: data.objectiveUpdate,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

async function findLatestMonthCheckin(userId: string, month: number, year: number) {
  const { db } = assertFirebaseConfigured()
  const checkinQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    where("month", "==", month),
    where("year", "==", year),
    orderBy("updatedAt", "desc"),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(checkinQuery)
  return snapshot.docs[0] ?? null
}

export async function getCurrentMonthCheckin(userId: string): Promise<UserMonthlyCheckin | null> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const found = await findLatestMonthCheckin(userId, month, year)

  if (!found) {
    return null
  }

  return mapMonthlyCheckin(found.id, found.data() as Partial<UserMonthlyCheckin>)
}

export async function getMonthlyCheckins(userId: string): Promise<UserMonthlyCheckin[]> {
  const { db } = assertFirebaseConfigured()
  const checkinsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(checkinsQuery)
  return snapshot.docs.map((checkinDoc) =>
    mapMonthlyCheckin(checkinDoc.id, checkinDoc.data() as Partial<UserMonthlyCheckin>)
  )
}

export async function createMonthlyCheckin(input: CreateMonthlyCheckinInput): Promise<UserMonthlyCheckin> {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()

  const payload = stripUndefinedDeep<Omit<UserMonthlyCheckin, "id">>({
    userId: input.userId,
    month: input.month,
    year: input.year,
    weightKg: input.weightKg,
    waistCm: input.waistCm,
    chestCm: input.chestCm,
    hipCm: input.hipCm,
    armCm: input.armCm,
    thighCm: input.thighCm,
    bodyFatPercentage: input.bodyFatPercentage,
    progressPhotoUrl: input.progressPhotoUrl,
    mood: input.mood,
    energyLevel: input.energyLevel,
    sleepQuality: input.sleepQuality,
    adherenceNote: input.adherenceNote,
    objectiveUpdate: input.objectiveUpdate,
    createdAt: now,
    updatedAt: now,
  })

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapMonthlyCheckin(created.id, payload)
}

export async function updateMonthlyCheckin(checkinId: string, input: UpdateMonthlyCheckinInput): Promise<void> {
  const { db } = assertFirebaseConfigured()
  await updateDoc(
    doc(db, COLLECTION_NAME, checkinId),
    stripUndefinedDeep({
      ...input,
      updatedAt: new Date().toISOString(),
    })
  )
}

export async function shouldRequestMonthlyCheckin(userId: string): Promise<boolean> {
  const current = await getCurrentMonthCheckin(userId)
  return !current
}

export async function uploadMonthlyProgressPhoto(userId: string, file: File): Promise<string> {
  const { storage } = assertFirebaseConfigured()
  const fileName = buildImageFileName(file)
  const candidatePaths = [
    `profile-progress-photos/${userId}/${fileName}`,
    `activity-photos/${userId}/progress-${fileName}`,
    `workout-execution-photos/${userId}/progress-${fileName}`,
  ]

  return uploadImageWithFallbackPaths({
    storage,
    file,
    candidatePaths,
    entityLabel: "foto de progresso",
  })
}
