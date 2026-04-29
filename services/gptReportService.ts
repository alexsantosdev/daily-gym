import type { GptReportPayload, GptReportResponse } from "@/types/gpt"

const REPORT_AI_SYSTEM_PROMPT = `Voce e o analista de desempenho do daily-gym.
Gere uma analise curta, acionavel e personalizada com base no periodo, resumo de refeicoes, resumo de treinos e metricas de consistencia.

Regras:
- Nao invente dados.
- Nao use linguagem medica.
- Nao faca promessas de resultado fisico.
- Seja pratico, objetivo e orientado a consistencia.
- Responda somente JSON valido no formato solicitado.

Formato obrigatorio:
{
  "summary": "string",
  "strengths": ["string"],
  "attentionPoints": ["string"],
  "suggestions": ["string"],
  "nextWeekFocus": ["string"],
  "consistencyScore": 0
}`

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

function extractTextFromOpenAIResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const candidate = payload as Record<string, unknown>

  if (typeof candidate.output_text === "string") {
    return candidate.output_text
  }

  const output = candidate.output
  if (!Array.isArray(output)) {
    return null
  }

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue
    }

    const content = (item as Record<string, unknown>).content
    if (!Array.isArray(content)) {
      continue
    }

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue
      }

      const text = (contentItem as Record<string, unknown>).text
      if (typeof text === "string") {
        return text
      }
    }
  }

  return null
}

function ensureStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const normalized = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  return normalized.length > 0 ? normalized.slice(0, 8) : fallback
}

function normalizeOpenAIAnalysis(
  raw: Partial<GptReportResponse>,
  payload: GptReportPayload
): GptReportResponse {
  const fallbackScore = clampScore(payload.consistencyMetrics.score)

  return {
    summary:
      typeof raw.summary === "string" && raw.summary.trim().length > 0
        ? raw.summary.trim()
        : `Periodo ${payload.periodStart} ate ${payload.periodEnd} analisado com foco em consistencia.`,
    strengths: ensureStringArray(raw.strengths, [
      "Manteve regularidade de registros no periodo.",
      "Treinos e refeicoes possuem base suficiente para evolucao continua.",
    ]),
    attentionPoints: ensureStringArray(raw.attentionPoints, [
      "Evitar lacunas longas sem registro para melhorar leitura de padrao.",
    ]),
    suggestions: ensureStringArray(raw.suggestions, [
      "Definir uma meta semanal minima de treinos executados.",
      "Padronizar horarios de refeicao para aumentar consistencia.",
    ]),
    nextWeekFocus: ensureStringArray(raw.nextWeekFocus, [
      "Manter sequencia de registros em dias planejados.",
      "Revisar cargas dos exercicios principais.",
    ]),
    consistencyScore: clampScore(
      typeof raw.consistencyScore === "number" ? raw.consistencyScore : fallbackScore
    ),
    generatedAt: new Date().toISOString(),
    source: "openai",
  }
}

async function generateOpenAIAnalysis(payload: GptReportPayload): Promise<GptReportResponse> {
  const userPrompt = `Contexto do usuario em JSON:\n${JSON.stringify(payload)}`

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        { role: "system", content: REPORT_AI_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`)
  }

  const openAIResult = (await response.json()) as unknown
  const text = extractTextFromOpenAIResponse(openAIResult)

  if (!text) {
    throw new Error("OpenAI nao retornou texto parseavel para analise de relatorio.")
  }

  const raw = JSON.parse(text) as Partial<GptReportResponse>
  return normalizeOpenAIAnalysis(raw, payload)
}

export async function generateGptAnalysis(payload: GptReportPayload): Promise<GptReportResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return generateMockGptAnalysis(payload)
  }

  try {
    return await generateOpenAIAnalysis(payload)
  } catch (error) {
    console.warn("Falha ao gerar analise real com OpenAI. Usando mock.", error)
    return generateMockGptAnalysis(payload)
  }
}

