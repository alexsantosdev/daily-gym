import { NextResponse } from "next/server"

import { generateGptAnalysis, validateGptReportPayload } from "@/services/gptReportService"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    if (!validateGptReportPayload(payload)) {
      return NextResponse.json(
        { error: "Payload invalido para geracao de analise" },
        { status: 400 }
      )
    }

    const analysis = await generateGptAnalysis(payload)
    return NextResponse.json({ analysis })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao gerar analise GPT",
      },
      { status: 500 }
    )
  }
}
