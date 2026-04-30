import { NextResponse } from "next/server"

import { isStravaRunOrWalkActivity } from "@/lib/stravaActivity"
import type { StravaSummaryActivity, StravaTokenExchangeResponse } from "@/types/strava"

interface ImportPayload {
  connection?: {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
  afterEpoch?: number
  perPage?: number
}

interface StravaTokenBundle {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

const DEFAULT_PER_PAGE = 50
const MAX_PER_PAGE = 200
const MAX_PAGES = 4

function getRequiredStravaEnv() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Variaveis STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET sao obrigatorias.")
  }

  return { clientId, clientSecret }
}

function needsRefresh(expiresAt: number) {
  const nowEpoch = Math.floor(Date.now() / 1000)
  return expiresAt - nowEpoch <= 120
}

async function refreshAccessToken(refreshToken: string): Promise<StravaTokenBundle> {
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

async function fetchRuns(accessToken: string, afterEpoch?: number, perPage = DEFAULT_PER_PAGE) {
  const selectedActivities: StravaSummaryActivity[] = []
  let totalFetched = 0
  const sportTypeCount = new Map<string, number>()

  function countType(rawType: string) {
    const key = rawType || "unknown"
    sportTypeCount.set(key, (sportTypeCount.get(key) ?? 0) + 1)
  }

  function isImportableActivity(activity: StravaSummaryActivity) {
    return isStravaRunOrWalkActivity(activity)
  }

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities")
    url.searchParams.set("page", String(page))
    url.searchParams.set("per_page", String(perPage))

    if (afterEpoch) {
      url.searchParams.set("after", String(afterEpoch))
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Falha ao buscar atividades no Strava (${response.status}). ${errorBody}`)
    }

    const pageActivities = (await response.json()) as StravaSummaryActivity[]

    if (!Array.isArray(pageActivities) || pageActivities.length === 0) {
      break
    }
    totalFetched += pageActivities.length
    for (const activity of pageActivities) {
      countType((activity.sport_type ?? activity.type ?? "").toString())
    }

    const pageRuns = pageActivities.filter((activity) => isImportableActivity(activity))

    selectedActivities.push(...pageRuns)

    if (pageActivities.length < perPage) {
      break
    }
  }

  return {
    runs: selectedActivities,
    totalFetched,
    sportTypeSummary: Object.fromEntries(sportTypeCount),
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ImportPayload

    const accessToken = payload.connection?.accessToken
    const refreshToken = payload.connection?.refreshToken
    const expiresAt = payload.connection?.expiresAt

    if (!accessToken || !refreshToken || typeof expiresAt !== "number") {
      return NextResponse.json(
        { error: "Credenciais do Strava incompletas para importacao." },
        { status: 400 }
      )
    }

    const perPage = Math.min(Math.max(payload.perPage ?? DEFAULT_PER_PAGE, 1), MAX_PER_PAGE)

    const token = needsRefresh(expiresAt)
      ? await refreshAccessToken(refreshToken)
      : {
          accessToken,
          refreshToken,
          expiresAt,
        }

    const { runs, totalFetched, sportTypeSummary } = await fetchRuns(
      token.accessToken,
      payload.afterEpoch,
      perPage
    )

    return NextResponse.json({
      token,
      activities: runs,
      debug: {
        totalFetched,
        importableMatched: runs.length,
        sportTypeSummary,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao importar corridas do Strava.",
      },
      { status: 500 }
    )
  }
}
