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
  CreateWorkoutExecutionInput,
  UpdateWorkoutExecutionInput,
  WorkoutExecution,
} from "@/types/workout"

const COLLECTION_NAME = "workoutExecutions"

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

function computeDurationMinutes(startedAt?: string, finishedAt?: string) {
  if (!startedAt || !finishedAt) {
    return undefined
  }

  const start = new Date(startedAt).getTime()
  const finish = new Date(finishedAt).getTime()

  if (Number.isNaN(start) || Number.isNaN(finish) || finish < start) {
    return undefined
  }

  return Math.max(1, Math.round((finish - start) / 60000))
}

function mapWorkoutExecution(id: string, data: Partial<WorkoutExecution>): WorkoutExecution {
  return {
    id,
    userId: data.userId ?? "",
    planId: data.planId ?? "",
    workoutId: data.workoutId ?? "",
    date: data.date ?? "",
    startedAt: data.startedAt,
    finishedAt: data.finishedAt,
    durationMinutes: data.durationMinutes,
    status: data.status ?? "planned",
    checkinType: data.checkinType ?? "manual",
    checkinAt: data.checkinAt,
    checkoutAt: data.checkoutAt,
    photoUrl: data.photoUrl,
    notes: data.notes,
    executedExercises: data.executedExercises ?? [],
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export async function createWorkoutExecution(input: CreateWorkoutExecutionInput) {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()

  const durationMinutes = computeDurationMinutes(input.startedAt, input.finishedAt)

  const payload = stripUndefinedDeep<Omit<WorkoutExecution, "id">>({
    userId: input.userId,
    planId: input.planId,
    workoutId: input.workoutId,
    date: input.date,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMinutes,
    status: input.status ?? "planned",
    checkinType: input.checkinType ?? "manual",
    checkinAt: input.checkinAt,
    checkoutAt: input.checkoutAt,
    photoUrl: input.photoUrl,
    notes: input.notes,
    executedExercises: input.executedExercises ?? [],
    createdAt: now,
    updatedAt: now,
  })

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapWorkoutExecution(created.id, payload)
}

export async function updateWorkoutExecution(
  workoutExecutionId: string,
  userId: string,
  input: UpdateWorkoutExecutionInput
) {
  const { db } = assertFirebaseConfigured()
  const durationMinutes = computeDurationMinutes(input.startedAt, input.finishedAt)
  const payload = stripUndefinedDeep({
    ...input,
    userId,
    durationMinutes,
    updatedAt: new Date().toISOString(),
  })

  await updateDoc(doc(db, COLLECTION_NAME, workoutExecutionId), payload)
}

export async function deleteWorkoutExecution(workoutExecutionId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, workoutExecutionId))
}

export async function listWorkoutExecutionsByUser(userId: string) {
  const { db } = assertFirebaseConfigured()
  const workoutExecutionsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(workoutExecutionsQuery)
  return snapshot.docs.map((executionDoc) =>
    mapWorkoutExecution(executionDoc.id, executionDoc.data() as Partial<WorkoutExecution>)
  )
}

export async function uploadWorkoutExecutionPhoto(userId: string, file: File) {
  const { storage } = assertFirebaseConfigured()
  const extension = file.name.split(".").pop() || "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  const fileRef = ref(storage, `workout-execution-photos/${userId}/${fileName}`)

  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}
