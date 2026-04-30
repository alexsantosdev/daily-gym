import type { StravaSummaryActivity, StravaTokenExchangeResponse } from "@/types/strava"

export interface StravaTokenBundle {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export function getRequiredStravaEnv() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Variaveis STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET sao obrigatorias.")
  }

  return { clientId, clientSecret }
}

export function getStravaWebhookVerifyToken() {
  return process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || "STRAVA_WEBHOOK_VERIFY_TOKEN"
}

export function tokenNeedsRefresh(expiresAt: number) {
  const nowEpoch = Math.floor(Date.now() / 1000)
  return expiresAt - nowEpoch <= 120
}

export async function refreshStravaAccessToken(refreshToken: string): Promise<StravaTokenBundle> {
  const { clientId, clientSecret } = getRequiredStravaEnv()

  const form = new URLSearchParams()
  form.set("client_id", clientId)
  form.set("client_secret", clientSecret)
  form.set("grant_type", "refresh_token")
  form.set("refresh_token", refreshToken)

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Falha ao atualizar token do Strava (${response.status}). ${errorBody}`)
  }

  const token = (await response.json()) as StravaTokenExchangeResponse

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_at,
  }
}

export async function ensureValidStravaToken(token: StravaTokenBundle) {
  if (!tokenNeedsRefresh(token.expiresAt)) {
    return token
  }

  return refreshStravaAccessToken(token.refreshToken)
}

export async function fetchStravaActivityById(accessToken: string, activityId: number) {
  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Falha ao buscar atividade no Strava (${response.status}). ${errorBody}`)
  }

  return (await response.json()) as StravaSummaryActivity
}

export async function listStravaPushSubscriptions() {
  const { clientId, clientSecret } = getRequiredStravaEnv()
  const url = new URL("https://www.strava.com/api/v3/push_subscriptions")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("client_secret", clientSecret)

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Falha ao listar subscriptions (${response.status}). ${errorBody}`)
  }

  return (await response.json()) as Array<{
    id: number
    callback_url: string
    created_at?: string
    updated_at?: string
  }>
}

export async function createStravaPushSubscription(callbackUrl: string, verifyToken: string) {
  const { clientId, clientSecret } = getRequiredStravaEnv()

  const form = new URLSearchParams()
  form.set("client_id", clientId)
  form.set("client_secret", clientSecret)
  form.set("callback_url", callbackUrl)
  form.set("verify_token", verifyToken)

  const response = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Falha ao criar subscription (${response.status}). ${errorBody}`)
  }

  return (await response.json()) as { id: number }
}

export async function deleteStravaPushSubscription(subscriptionId: number) {
  const { clientId, clientSecret } = getRequiredStravaEnv()
  const url = new URL(`https://www.strava.com/api/v3/push_subscriptions/${subscriptionId}`)
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("client_secret", clientSecret)

  const response = await fetch(url.toString(), {
    method: "DELETE",
  })

  if (!response.ok && response.status !== 204) {
    const errorBody = await response.text()
    throw new Error(`Falha ao remover subscription (${response.status}). ${errorBody}`)
  }
}
