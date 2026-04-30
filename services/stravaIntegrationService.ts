import type { StravaConnection, StravaSummaryActivity, StravaTokenExchangeResponse } from "@/types/strava"

const STRAVA_AUTH_BASE_URL = "https://www.strava.com/oauth/authorize"
const OAUTH_SCOPES = ["activity:read"]

export interface StravaExchangePayload {
  code: string
}

export interface StravaExchangeResult {
  token: StravaTokenExchangeResponse
}

export interface StravaImportRunsPayload {
  connection: Pick<StravaConnection, "accessToken" | "refreshToken" | "expiresAt">
  afterEpoch?: number
  perPage?: number
}

export interface StravaImportRunsResult {
  token: {
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
  activities: StravaSummaryActivity[]
  debug?: {
    totalFetched: number
    importableMatched: number
    sportTypeSummary?: Record<string, number>
  }
}

export interface StravaWebhookSubscription {
  id: number
  callback_url: string
  created_at?: string
  updated_at?: string
}

export function createStravaOAuthState(userId: string) {
  const nonce = Math.random().toString(36).slice(2)
  return `${userId}.${nonce}`
}

export function buildStravaAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  scope?: string[]
}) {
  const scope = (params.scope ?? OAUTH_SCOPES).join(",")
  const url = new URL(STRAVA_AUTH_BASE_URL)
  url.searchParams.set("client_id", params.clientId)
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("approval_prompt", "auto")
  url.searchParams.set("scope", scope)
  url.searchParams.set("state", params.state)
  return url.toString()
}

export function getStravaClientId() {
  return process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? ""
}

export async function getResolvedStravaClientId() {
  const publicClientId = getStravaClientId()
  if (publicClientId) {
    return publicClientId
  }

  const response = await fetch("/api/strava/config", {
    cache: "no-store",
  })

  if (!response.ok) {
    return ""
  }

  const data = (await response.json()) as { clientId?: string }
  return data.clientId ?? ""
}

export async function exchangeStravaCode(payload: StravaExchangePayload) {
  const response = await fetch("/api/strava/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Falha ao concluir autenticacao com Strava.")
  }

  return (await response.json()) as StravaExchangeResult
}

export async function importStravaRuns(payload: StravaImportRunsPayload) {
  const response = await fetch("/api/strava/import-runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Falha ao importar corridas do Strava.")
  }

  return (await response.json()) as StravaImportRunsResult
}

export async function listStravaWebhookSubscriptions() {
  const response = await fetch("/api/strava/webhooks/subscription", {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Falha ao listar subscriptions de webhook.")
  }

  const data = (await response.json()) as { subscriptions: StravaWebhookSubscription[] }
  return data.subscriptions
}

export async function createStravaWebhookSubscription(callbackUrl?: string) {
  const response = await fetch("/api/strava/webhooks/subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ callbackUrl }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Falha ao criar subscription de webhook.")
  }

  return (await response.json()) as {
    subscriptionId: number
    callbackUrl: string
    reused?: boolean
  }
}

export function parseAcceptedScopes(scopeValue?: string) {
  if (!scopeValue) {
    return [] as string[]
  }

  return scopeValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
