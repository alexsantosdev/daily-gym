import { NextRequest, NextResponse } from "next/server"

import {
  createStravaPushSubscription,
  deleteStravaPushSubscription,
  getStravaWebhookVerifyToken,
  listStravaPushSubscriptions,
} from "@/services/stravaServerService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface CreateSubscriptionPayload {
  callbackUrl?: string
}

function getDefaultCallbackUrl(request: NextRequest) {
  const configuredValue = process.env.STRAVA_WEBHOOK_CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configuredValue) {
    const normalized = configuredValue.replace(/\/$/, "")
    if (normalized.endsWith("/api/strava/webhooks")) {
      return normalized
    }
    return `${normalized}/api/strava/webhooks`
  }

  const baseFromRequest = request.nextUrl.origin
  return `${baseFromRequest}/api/strava/webhooks`
}

export async function GET() {
  try {
    const subscriptions = await listStravaPushSubscriptions()
    return NextResponse.json({ subscriptions })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao listar webhook subscriptions.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateSubscriptionPayload
    const callbackUrl = body.callbackUrl || getDefaultCallbackUrl(request)
    const currentSubscriptions = await listStravaPushSubscriptions()

    if (currentSubscriptions.length > 0) {
      return NextResponse.json({
        subscriptionId: currentSubscriptions[0].id,
        callbackUrl: currentSubscriptions[0].callback_url,
        reused: true,
      })
    }

    const created = await createStravaPushSubscription(callbackUrl, getStravaWebhookVerifyToken())

    return NextResponse.json({
      subscriptionId: created.id,
      callbackUrl,
      reused: false,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao criar webhook subscription.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const subscriptionIdRaw = request.nextUrl.searchParams.get("subscriptionId")
    const subscriptionId = Number(subscriptionIdRaw)

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      return NextResponse.json({ error: "subscriptionId invalido." }, { status: 400 })
    }

    await deleteStravaPushSubscription(subscriptionId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao remover webhook subscription.",
      },
      { status: 500 }
    )
  }
}
