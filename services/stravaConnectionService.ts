import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore"

import { assertFirebaseConfigured } from "@/lib/firebase"
import type { StravaConnection } from "@/types/strava"

const COLLECTION_NAME = "stravaConnections"

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

function mapConnection(data: Partial<StravaConnection>, userId: string): StravaConnection | null {
  if (!data.accessToken || !data.refreshToken || !data.expiresAt || !data.athleteId) {
    return null
  }

  return {
    userId,
    athleteId: Number(data.athleteId),
    athleteName: data.athleteName ?? "Atleta Strava",
    scope: Array.isArray(data.scope) ? data.scope : [],
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Number(data.expiresAt),
    connectedAt: data.connectedAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    lastSyncAt: data.lastSyncAt,
  }
}

export async function getStravaConnection(userId: string) {
  const { db } = assertFirebaseConfigured()
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, userId))

  if (!snapshot.exists()) {
    return null
  }

  return mapConnection(snapshot.data() as Partial<StravaConnection>, userId)
}

export async function getStravaConnectionByAthleteId(athleteId: number) {
  const { db } = assertFirebaseConfigured()
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), where("athleteId", "==", athleteId), limit(1))
  )
  const first = snapshot.docs[0]

  if (!first) {
    return null
  }

  return mapConnection(first.data() as Partial<StravaConnection>, first.id)
}

export async function upsertStravaConnection(connection: Omit<StravaConnection, "updatedAt">) {
  const { db } = assertFirebaseConfigured()
  const payload = stripUndefinedDeep<StravaConnection>({
    ...connection,
    updatedAt: new Date().toISOString(),
  })

  await setDoc(doc(db, COLLECTION_NAME, connection.userId), payload)
}

export async function deleteStravaConnection(userId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, userId))
}
