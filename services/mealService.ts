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
import type { CreateMealInput, Meal, UpdateMealInput } from "@/types/meal"

const COLLECTION_NAME = "meals"

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

function mapMeal(id: string, data: Partial<Meal>): Meal {
  return {
    id,
    userId: data.userId ?? "",
    date: data.date ?? "",
    time: data.time ?? "",
    mealType: data.mealType ?? "other",
    description: data.description ?? "",
    photoUrl: data.photoUrl,
    notes: data.notes,
    tags: data.tags ?? [],
    estimatedMacros: data.estimatedMacros,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export async function createMeal(input: CreateMealInput) {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()

  const payload = stripUndefinedDeep<Omit<Meal, "id">>({
    userId: input.userId,
    date: input.date,
    time: input.time,
    mealType: input.mealType,
    description: input.description,
    photoUrl: input.photoUrl,
    notes: input.notes,
    tags: input.tags ?? [],
    estimatedMacros: input.estimatedMacros,
    createdAt: now,
    updatedAt: now,
  })

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapMeal(created.id, payload)
}

export async function updateMeal(mealId: string, userId: string, input: UpdateMealInput) {
  const { db } = assertFirebaseConfigured()
  const mealRef = doc(db, COLLECTION_NAME, mealId)
  const payload = stripUndefinedDeep({
    ...input,
    userId,
    updatedAt: new Date().toISOString(),
  })
  await updateDoc(mealRef, payload)
}

export async function deleteMeal(mealId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, mealId))
}

export async function listMealsByUser(userId: string) {
  const { db } = assertFirebaseConfigured()
  const mealsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    orderBy("time", "desc")
  )

  const snapshot = await getDocs(mealsQuery)
  return snapshot.docs.map((mealDoc) => mapMeal(mealDoc.id, mealDoc.data() as Partial<Meal>))
}

export async function listMealsByDay(userId: string, date: string) {
  const { db } = assertFirebaseConfigured()
  const mealsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    where("date", "==", date),
    orderBy("time", "desc")
  )

  const snapshot = await getDocs(mealsQuery)
  return snapshot.docs.map((mealDoc) => mapMeal(mealDoc.id, mealDoc.data() as Partial<Meal>))
}

export async function uploadMealPhoto(userId: string, file: File) {
  const { storage } = assertFirebaseConfigured()
  const extension = file.name.split(".").pop() || "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  const fileRef = ref(storage, `meal-photos/${userId}/${fileName}`)

  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}
