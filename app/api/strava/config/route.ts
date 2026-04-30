import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || process.env.STRAVA_CLIENT_ID || ""
  return NextResponse.json({ clientId })
}
