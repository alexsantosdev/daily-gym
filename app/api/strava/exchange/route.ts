import { NextResponse } from "next/server"

import type { StravaTokenExchangeResponse } from "@/types/strava"

interface ExchangePayload {
  code?: string
}

function getRequiredStravaEnv() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Variaveis STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET sao obrigatorias.")
  }

  return { clientId, clientSecret }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExchangePayload

    if (!body.code) {
      return NextResponse.json({ error: "Codigo OAuth do Strava nao informado." }, { status: 400 })
    }

    const { clientId, clientSecret } = getRequiredStravaEnv()

    const form = new URLSearchParams()
    form.set("client_id", clientId)
    form.set("client_secret", clientSecret)
    form.set("code", body.code)
    form.set("grant_type", "authorization_code")

    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      return NextResponse.json(
        { error: `Falha ao trocar codigo por token no Strava (${tokenResponse.status}). ${errorBody}` },
        { status: 502 }
      )
    }

    const token = (await tokenResponse.json()) as StravaTokenExchangeResponse

    return NextResponse.json({ token })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao autenticar com Strava.",
      },
      { status: 500 }
    )
  }
}
