import { NextRequest, NextResponse } from "next/server"

import {
  createActivity,
  deleteActivityBySourceExternalId,
  getActivityBySourceExternalId,
  updateActivity,
} from "@/services/activityService"
import {
  deleteStravaConnection,
  getStravaConnectionByAthleteId,
  upsertStravaConnection,
} from "@/services/stravaConnectionService"
import {
  ensureValidStravaToken,
  fetchStravaActivityById,
  getStravaWebhookVerifyToken,
} from "@/services/stravaServerService"
import { logStravaWebhookEvent } from "@/services/stravaWebhookEventService"
import { updateUserProfile } from "@/services/profileService"
import {
  buildStravaActivityNotes,
  getStravaActivityDate,
  isStravaRunOrWalkActivity,
  toActivityTypeFromStrava,
} from "@/lib/stravaActivity"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface StravaWebhookPayload {
  object_type: "activity" | "athlete"
  object_id: number
  aspect_type: "create" | "update" | "delete"
  owner_id: number
  subscription_id?: number
  event_time?: number
  updates?: Record<string, unknown>
}

async function syncActivityEvent(payload: StravaWebhookPayload) {
  const connection = await getStravaConnectionByAthleteId(payload.owner_id)

  if (!connection) {
    await logStravaWebhookEvent({
      objectType: payload.object_type,
      aspectType: payload.aspect_type,
      objectId: payload.object_id,
      ownerId: payload.owner_id,
      subscriptionId: payload.subscription_id,
      updates: payload.updates,
      status: "ignored",
      message: "Conexao Strava nao encontrada para owner_id.",
    })
    return
  }

  if (payload.aspect_type === "delete") {
    await deleteActivityBySourceExternalId(connection.userId, "strava", String(payload.object_id))
    await logStravaWebhookEvent({
      objectType: payload.object_type,
      aspectType: payload.aspect_type,
      objectId: payload.object_id,
      ownerId: payload.owner_id,
      subscriptionId: payload.subscription_id,
      updates: payload.updates,
      status: "processed",
      message: "Atividade removida localmente via webhook delete.",
    })
    return
  }

  const token = await ensureValidStravaToken({
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    expiresAt: connection.expiresAt,
  })

  if (
    token.accessToken !== connection.accessToken ||
    token.refreshToken !== connection.refreshToken ||
    token.expiresAt !== connection.expiresAt
  ) {
    const nextConnection = {
      ...connection,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      updatedAt: new Date().toISOString(),
    }
    await upsertStravaConnection(nextConnection)
  }

  const detailedActivity = await fetchStravaActivityById(token.accessToken, payload.object_id)

  if (!isStravaRunOrWalkActivity(detailedActivity)) {
    await deleteActivityBySourceExternalId(connection.userId, "strava", String(payload.object_id))
    await logStravaWebhookEvent({
      objectType: payload.object_type,
      aspectType: payload.aspect_type,
      objectId: payload.object_id,
      ownerId: payload.owner_id,
      subscriptionId: payload.subscription_id,
      updates: payload.updates,
      status: "ignored",
      message: "Atividade nao elegivel (nao corrida/caminhada).",
    })
    return
  }

  const durationMinutes = Math.max(1, Math.round((detailedActivity.moving_time ?? 0) / 60))

  const mappedInput = {
    name: detailedActivity.name || "Atividade Strava",
    type: toActivityTypeFromStrava(detailedActivity),
    date: getStravaActivityDate(detailedActivity),
    durationMinutes,
    notes: buildStravaActivityNotes(detailedActivity),
    source: "strava" as const,
    externalSourceId: String(detailedActivity.id),
    sourceMetadata: {
      sportType: detailedActivity.sport_type ?? detailedActivity.type,
      distanceMeters: detailedActivity.distance,
      movingTimeSeconds: detailedActivity.moving_time,
      elapsedTimeSeconds: detailedActivity.elapsed_time,
      elevationGainMeters: detailedActivity.total_elevation_gain,
      averageSpeedMps: detailedActivity.average_speed,
      averageHeartrateBpm: detailedActivity.average_heartrate,
      calories: detailedActivity.calories,
      startedAt: detailedActivity.start_date_local ?? detailedActivity.start_date,
    },
  }

  const existing = await getActivityBySourceExternalId(connection.userId, "strava", String(payload.object_id))
  if (existing) {
    await updateActivity(existing.id, connection.userId, mappedInput)
  } else {
    await createActivity({ ...mappedInput, userId: connection.userId })
  }

  await updateUserProfile(connection.userId, {
    stravaIntegration: {
      connected: true,
      athleteId: connection.athleteId,
      athleteName: connection.athleteName,
      scope: connection.scope,
      connectedAt: connection.connectedAt,
      lastSyncAt: new Date().toISOString(),
    },
  })

  await logStravaWebhookEvent({
    objectType: payload.object_type,
    aspectType: payload.aspect_type,
    objectId: payload.object_id,
    ownerId: payload.owner_id,
    subscriptionId: payload.subscription_id,
    updates: payload.updates,
    status: "processed",
    message: existing ? "Atividade atualizada via webhook." : "Atividade criada via webhook.",
  })
}

async function handleAthleteEvent(payload: StravaWebhookPayload) {
  const authorized = payload.updates?.authorized
  if (authorized !== "false") {
    await logStravaWebhookEvent({
      objectType: payload.object_type,
      aspectType: payload.aspect_type,
      objectId: payload.object_id,
      ownerId: payload.owner_id,
      subscriptionId: payload.subscription_id,
      updates: payload.updates,
      status: "ignored",
      message: "Evento de atleta sem deautorizacao.",
    })
    return
  }

  const connection = await getStravaConnectionByAthleteId(payload.owner_id)
  if (!connection) {
    return
  }

  await deleteStravaConnection(connection.userId)
  await updateUserProfile(connection.userId, {
    stravaIntegration: {
      connected: false,
    },
  })

  await logStravaWebhookEvent({
    objectType: payload.object_type,
    aspectType: payload.aspect_type,
    objectId: payload.object_id,
    ownerId: payload.owner_id,
    subscriptionId: payload.subscription_id,
    updates: payload.updates,
    status: "processed",
    message: "Conexao Strava removida por deautorizacao do atleta.",
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const challenge = searchParams.get("hub.challenge")
  const verifyToken = searchParams.get("hub.verify_token")

  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ error: "Webhook challenge invalido." }, { status: 400 })
  }

  if (verifyToken !== getStravaWebhookVerifyToken()) {
    return NextResponse.json({ error: "verify_token invalido." }, { status: 403 })
  }

  return NextResponse.json({ "hub.challenge": challenge })
}

export async function POST(request: NextRequest) {
  let payload: StravaWebhookPayload | null = null

  try {
    payload = (await request.json()) as StravaWebhookPayload

    if (
      !payload ||
      (payload.object_type !== "activity" && payload.object_type !== "athlete") ||
      (payload.aspect_type !== "create" &&
        payload.aspect_type !== "update" &&
        payload.aspect_type !== "delete") ||
      !payload.object_id ||
      !payload.owner_id
    ) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    await logStravaWebhookEvent({
      objectType: payload.object_type,
      aspectType: payload.aspect_type,
      objectId: payload.object_id,
      ownerId: payload.owner_id,
      subscriptionId: payload.subscription_id,
      updates: payload.updates,
      status: "received",
    })

    if (payload.object_type === "activity") {
      await syncActivityEvent(payload)
    } else if (payload.object_type === "athlete") {
      await handleAthleteEvent(payload)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar webhook do Strava."

    if (payload) {
      await logStravaWebhookEvent({
        objectType: payload.object_type,
        aspectType: payload.aspect_type,
        objectId: payload.object_id,
        ownerId: payload.owner_id,
        subscriptionId: payload.subscription_id,
        updates: payload.updates,
        status: "failed",
        message,
      }).catch(() => {
        // evita quebrar a resposta do webhook se o log tambem falhar
      })
    }

    return NextResponse.json({ ok: true, error: message })
  }
}
