import { NextResponse } from "next/server"

import {
  generateWorkoutShareAnalysis,
  validateWorkoutShareAnalysisPayload,
} from "@/services/workoutAIAnalysisService"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    if (!validateWorkoutShareAnalysisPayload(payload)) {
      return NextResponse.json({ error: "Payload invalido para analise de treino." }, { status: 400 })
    }

    const analysis = await generateWorkoutShareAnalysis(payload)
    return NextResponse.json({ analysis })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao gerar analise de share do treino.",
      },
      { status: 500 }
    )
  }
}
