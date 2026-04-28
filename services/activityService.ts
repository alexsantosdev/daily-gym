import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"

import { assertFirebaseConfigured } from "@/lib/firebase"
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
} from "@/types/activity"

const COLLECTION_NAME = "activities"

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

function mapActivity(id: string, data: Partial<Activity>): Activity {
  return {
    id,
    userId: data.userId ?? "",
    name: data.name ?? "",
    type: data.type ?? "custom",
    date: data.date ?? "",
    durationMinutes:
      typeof data.durationMinutes === "number" ? Number(data.durationMinutes) : undefined,
    notes: data.notes,
    photoUrl: data.photoUrl,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export async function createActivity(input: CreateActivityInput) {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()
  const payload = stripUndefinedDeep<Omit<Activity, "id">>({
    userId: input.userId,
    name: input.name.trim(),
    type: input.type,
    date: input.date,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    photoUrl: input.photoUrl,
    createdAt: now,
    updatedAt: now,
  })

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapActivity(created.id, payload)
}

export async function updateActivity(activityId: string, userId: string, input: UpdateActivityInput) {
  const { db } = assertFirebaseConfigured()
  await updateDoc(
    doc(db, COLLECTION_NAME, activityId),
    stripUndefinedDeep({
      ...input,
      userId,
      updatedAt: new Date().toISOString(),
    })
  )
}

export async function deleteActivity(activityId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, activityId))
}

export async function getActivitiesByUser(userId: string, range?: { start?: string; end?: string }) {
  const constraints = [where("userId", "==", userId), orderBy("date", "desc"), orderBy("createdAt", "desc")]

  if (range?.start) {
    constraints.push(where("date", ">=", range.start))
  }

  if (range?.end) {
    constraints.push(where("date", "<=", range.end))
  }

  const { db } = assertFirebaseConfigured()
  const activitiesQuery = query(collection(db, COLLECTION_NAME), ...constraints)
  const snapshot = await getDocs(activitiesQuery)
  return snapshot.docs.map((activityDoc) =>
    mapActivity(activityDoc.id, activityDoc.data() as Partial<Activity>)
  )
}

export async function getActivitiesByDate(userId: string, date: string) {
  const { db } = assertFirebaseConfigured()
  const activitiesQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    where("date", "==", date),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(activitiesQuery)
  return snapshot.docs.map((activityDoc) =>
    mapActivity(activityDoc.id, activityDoc.data() as Partial<Activity>)
  )
}

export async function uploadActivityPhoto(userId: string, file: File) {
  const { storage } = assertFirebaseConfigured()
  const extension = file.name.split(".").pop() || "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  const fileRef = ref(storage, `activity-photos/${userId}/${fileName}`)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}
