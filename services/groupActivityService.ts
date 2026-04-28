import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryConstraint,
  where,
} from "firebase/firestore"

import { getPointsByActivityType } from "@/lib/groupScore"
import { assertFirebaseConfigured } from "@/lib/firebase"
import { getUserGroups } from "@/services/groupService"
import type { Activity } from "@/types/activity"
import type { Meal } from "@/types/meal"
import type { CreateGroupActivityInput, GroupActivity } from "@/types/group"
import type { WorkoutExecution, WorkoutPlan, Workout } from "@/types/workout"

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

function mapActivity(id: string, groupId: string, data: Partial<GroupActivity>): GroupActivity {
  return {
    id,
    groupId,
    userId: data.userId ?? "",
    userName: data.userName ?? "",
    userPhotoURL: data.userPhotoURL,
    type: data.type ?? "manual",
    date: data.date ?? "",
    title: data.title ?? "",
    description: data.description,
    photoUrl: data.photoUrl,
    workoutExecutionId: data.workoutExecutionId,
    mealId: data.mealId,
    points: Number(data.points ?? 0),
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

function getGroupActivitiesCollection(groupId: string) {
  const { db } = assertFirebaseConfigured()
  return collection(db, "groups", groupId, "activities")
}

interface ActivityPeriod {
  start?: string
  end?: string
}

export async function createGroupActivity(input: CreateGroupActivityInput): Promise<GroupActivity> {
  const now = new Date().toISOString()
  const payload: Omit<GroupActivity, "id"> = {
    groupId: input.groupId,
    userId: input.userId,
    userName: input.userName,
    userPhotoURL: input.userPhotoURL,
    type: input.type,
    date: input.date,
    title: input.title,
    description: input.description,
    photoUrl: input.photoUrl,
    workoutExecutionId: input.workoutExecutionId,
    mealId: input.mealId,
    points: input.points,
    createdAt: now,
  }

  const created = await addDoc(getGroupActivitiesCollection(input.groupId), stripUndefinedDeep(payload))
  return mapActivity(created.id, input.groupId, payload)
}

export async function getGroupActivities(groupId: string, period?: ActivityPeriod): Promise<GroupActivity[]> {
  const constraints: QueryConstraint[] = [
    orderBy("date", "desc"),
    orderBy("createdAt", "desc"),
    limit(200),
  ]

  if (period?.start) {
    constraints.push(where("date", ">=", period.start))
  }

  if (period?.end) {
    constraints.push(where("date", "<=", period.end))
  }

  const activitiesQuery = query(getGroupActivitiesCollection(groupId), ...constraints)
  const snapshot = await getDocs(activitiesQuery)

  return snapshot.docs.map((activityDoc) =>
    mapActivity(activityDoc.id, groupId, activityDoc.data() as Partial<GroupActivity>)
  )
}

interface SyncWorkoutExecutionInput {
  userId: string
  userName?: string | null
  userPhotoURL?: string | null
  execution: WorkoutExecution
  plan?: WorkoutPlan | null
  workout?: Workout | null
}

export async function syncWorkoutExecutionToGroups(input: SyncWorkoutExecutionInput) {
  try {
    const groups = await getUserGroups(input.userId)
    if (groups.length === 0) {
      return
    }

    const status = input.execution.status
    const isCompleted = status === "executed" || status === "partial"
    const isCheckin = status === "in_progress" || Boolean(input.execution.checkinAt)
    await Promise.all(
      groups
        .filter((group) => group.status === "active")
        .map(async (group) => {
          if (isCheckin) {
            await createGroupActivity({
              groupId: group.id,
              userId: input.userId,
              userName: input.userName?.trim() || "Atleta",
              userPhotoURL: input.userPhotoURL,
              type: "workout_checkin",
              date: input.execution.date,
              title: "Fez check-in de treino",
              description: input.workout?.name ?? input.plan?.name ?? "Treino iniciado",
              workoutExecutionId: input.execution.id,
              points: getPointsByActivityType("workout_checkin"),
            })
          }

          if (isCompleted) {
            const points =
              status === "executed"
                ? getPointsByActivityType("workout_completed")
                : Math.round(getPointsByActivityType("workout_completed") / 2)

            await createGroupActivity({
              groupId: group.id,
              userId: input.userId,
              userName: input.userName?.trim() || "Atleta",
              userPhotoURL: input.userPhotoURL,
              type: "workout_completed",
              date: input.execution.date,
              title: status === "executed" ? "Concluiu treino" : "Concluiu treino parcial",
              description: input.workout?.name ?? input.plan?.name ?? "Treino",
              workoutExecutionId: input.execution.id,
              points,
            })
          }

          if (input.execution.photoUrl) {
            await createGroupActivity({
              groupId: group.id,
              userId: input.userId,
              userName: input.userName?.trim() || "Atleta",
              userPhotoURL: input.userPhotoURL,
              type: "workout_photo",
              date: input.execution.date,
              title: "Compartilhou foto do treino",
              description: input.workout?.name ?? "Treino",
              photoUrl: input.execution.photoUrl,
              workoutExecutionId: input.execution.id,
              points: getPointsByActivityType("workout_photo"),
            })
          }
        })
    )
  } catch (error) {
    console.warn("Nao foi possivel sincronizar execucao com grupos.", error)
  }
}

interface SyncMealPhotoInput {
  userId: string
  userName?: string | null
  userPhotoURL?: string | null
  meal: Meal
}

export async function syncMealPhotoToGroups(input: SyncMealPhotoInput) {
  if (!input.meal.photoUrl) {
    return
  }

  try {
    const groups = await getUserGroups(input.userId)
    if (groups.length === 0) {
      return
    }

    await Promise.all(
      groups
        .filter((group) => group.status === "active")
        .map((group) =>
          createGroupActivity({
            groupId: group.id,
            userId: input.userId,
            userName: input.userName?.trim() || "Atleta",
            userPhotoURL: input.userPhotoURL,
            type: "meal_photo",
            date: input.meal.date,
            title: "Registrou refeicao com foto",
            description: input.meal.description,
            photoUrl: input.meal.photoUrl,
            mealId: input.meal.id,
            points: getPointsByActivityType("meal_photo"),
          })
        )
    )
  } catch (error) {
    console.warn("Nao foi possivel sincronizar refeicao com grupos.", error)
  }
}

interface SyncActivityToGroupsInput {
  userId: string
  userName?: string | null
  userPhotoURL?: string | null
  activity: Activity
}

export async function syncActivityToGroups(input: SyncActivityToGroupsInput) {
  try {
    const groups = await getUserGroups(input.userId)
    if (groups.length === 0) {
      return
    }

    await Promise.all(
      groups
        .filter((group) => group.status === "active")
        .map(async (group) => {
          await createGroupActivity({
            groupId: group.id,
            userId: input.userId,
            userName: input.userName?.trim() || "Atleta",
            userPhotoURL: input.userPhotoURL,
            type: "activity_completed",
            date: input.activity.date,
            title: "Registrou uma atividade",
            description: input.activity.name,
            points: getPointsByActivityType("activity_completed"),
          })

          if (input.activity.photoUrl) {
            await createGroupActivity({
              groupId: group.id,
              userId: input.userId,
              userName: input.userName?.trim() || "Atleta",
              userPhotoURL: input.userPhotoURL,
              type: "activity_photo",
              date: input.activity.date,
              title: "Compartilhou foto da atividade",
              description: input.activity.name,
              photoUrl: input.activity.photoUrl,
              points: getPointsByActivityType("activity_photo"),
            })
          }
        })
    )
  } catch (error) {
    console.warn("Nao foi possivel sincronizar atividade com grupos.", error)
  }
}
