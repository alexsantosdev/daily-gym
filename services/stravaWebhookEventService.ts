import { addDoc, collection } from "firebase/firestore"

import { assertFirebaseConfigured } from "@/lib/firebase"

export interface StravaWebhookEventLogInput {
  objectType: string
  aspectType: string
  objectId: number
  ownerId: number
  subscriptionId?: number
  updates?: Record<string, unknown>
  status: "received" | "processed" | "ignored" | "failed"
  message?: string
}

const COLLECTION_NAME = "stravaWebhookEvents"

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

export async function logStravaWebhookEvent(input: StravaWebhookEventLogInput) {
  const { db } = assertFirebaseConfigured()
  await addDoc(collection(db, COLLECTION_NAME), stripUndefinedDeep({
    objectType: input.objectType,
    aspectType: input.aspectType,
    objectId: input.objectId,
    ownerId: input.ownerId,
    subscriptionId: input.subscriptionId,
    updates: input.updates,
    status: input.status,
    message: input.message,
    createdAt: new Date().toISOString(),
  }))
}
