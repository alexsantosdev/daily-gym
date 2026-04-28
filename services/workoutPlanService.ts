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

import { assertFirebaseConfigured } from "@/lib/firebase"
import type {
  CreateWorkoutPlanInput,
  UpdateWorkoutPlanInput,
  WorkoutPlan,
} from "@/types/workout"

const COLLECTION_NAME = "workoutPlans"

function mapWorkoutPlan(id: string, data: Partial<WorkoutPlan>): WorkoutPlan {
  return {
    id,
    userId: data.userId ?? "",
    name: data.name ?? "",
    goal: data.goal ?? "other",
    description: data.description,
    weekdays: data.weekdays ?? [],
    workoutIds: data.workoutIds ?? [],
    status: data.status ?? "inactive",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export async function createWorkoutPlan(input: CreateWorkoutPlanInput) {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()

  const payload: Omit<WorkoutPlan, "id"> = {
    userId: input.userId,
    name: input.name,
    goal: input.goal,
    description: input.description,
    weekdays: input.weekdays,
    workoutIds: input.workoutIds ?? [],
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  }

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapWorkoutPlan(created.id, payload)
}

export async function updateWorkoutPlan(
  workoutPlanId: string,
  userId: string,
  input: UpdateWorkoutPlanInput
) {
  const { db } = assertFirebaseConfigured()
  await updateDoc(doc(db, COLLECTION_NAME, workoutPlanId), {
    ...input,
    userId,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteWorkoutPlan(workoutPlanId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, workoutPlanId))
}

export async function listWorkoutPlansByUser(userId: string) {
  const { db } = assertFirebaseConfigured()
  const workoutPlansQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(workoutPlansQuery)
  return snapshot.docs.map((planDoc) =>
    mapWorkoutPlan(planDoc.id, planDoc.data() as Partial<WorkoutPlan>)
  )
}
