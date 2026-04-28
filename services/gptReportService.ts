import type { GptReportPayload, GptReportResponse } from "@/types/gpt"

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function validateGptReportPayload(payload: unknown): payload is GptReportPayload {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>

  return (
    typeof candidate.periodStart === "string" &&
    typeof candidate.periodEnd === "string" &&
    Array.isArray(candidate.mealsSummary) &&
    Array.isArray(candidate.workoutsSummary) &&
    typeof candidate.consistencyMetrics === "object" &&
    candidate.consistencyMetrics !== null
  )
}

export async function generateMockGptAnalysis(
  payload: GptReportPayload
): Promise<GptReportResponse> {
  const score = clampScore(payload.consistencyMetrics.score)

  return {
    summary: `Periodo ${payload.periodStart} ate ${payload.periodEnd}: progresso consistente com foco em ajustes graduais para manter ritmo.`,
    strengths: [
      "Frequencia de registro manteve boa regularidade.",
      "Treinos executados mostram continuidade no periodo.",
    ],
    attentionPoints: [
      "Monitorar dias sem refeicao registrada para reduzir lacunas.",
      "Padronizar carga e repeticoes por exercicio para analise mais precisa.",
    ],
    suggestions: [
      "Priorizar dois horarios fixos de refeicao por dia para aumentar consistencia alimentar.",
      "Definir meta minima de treinos executados por semana com revisao no fim da semana.",
    ],
    nextWeekFocus: [
      "Manter check-in do treino antes do primeiro exercicio.",
      "Registrar carga usada nos exercicios principais.",
      "Evitar mais de 1 dia seguido sem registro.",
    ],
    consistencyScore: score,
    generatedAt: new Date().toISOString(),
    source: "mock",
  }
}

async function generateOpenAIPlaceholder(payload: GptReportPayload): Promise<GptReportResponse> {
  const score = clampScore(payload.consistencyMetrics.score)

  // Placeholder for future OpenAI integration.
  return {
    summary: `Integracao OpenAI preparada. Resultado temporario para ${payload.periodStart} a ${payload.periodEnd}.`,
    strengths: ["Estrutura de payload validada para uso server-side."],
    attentionPoints: ["Conectar chamada ao SDK OpenAI quando a chave estiver disponivel."],
    suggestions: ["Manter dados resumidos e objetivos para melhorar a resposta do modelo."],
    nextWeekFocus: ["Concluir integracao real da API."],
    consistencyScore: score,
    generatedAt: new Date().toISOString(),
    source: "openai",
  }
}

export async function generateGptAnalysis(payload: GptReportPayload): Promise<GptReportResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return generateMockGptAnalysis(payload)
  }

  return generateOpenAIPlaceholder(payload)
}
