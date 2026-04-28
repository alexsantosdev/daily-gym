import { NextResponse } from "next/server"

import { buildPersonalAIUserPrompt, PERSONAL_AI_SYSTEM_PROMPT } from "@/lib/aiPrompts"
import type {
  AIRecommendation,
  AIRecommendationType,
  PersonalAIRequestPayload,
  PersonalAIResponse,
  UserAIContext,
} from "@/types/ai"

function isValidContext(context: unknown): context is UserAIContext {
  if (!context || typeof context !== "object") {
    return false
  }

  const candidate = context as Record<string, unknown>
  return typeof candidate.userId === "string" && typeof candidate.stats === "object"
}

function isValidType(type: unknown): type is AIRecommendationType {
  return (
    type === "workout_plan" ||
    type === "workout_adjustment" ||
    type === "activity_suggestion" ||
    type === "nutrition_suggestion" ||
    type === "progress_analysis"
  )
}

function isValidPayload(payload: unknown): payload is PersonalAIRequestPayload {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return isValidType(candidate.type) && isValidContext(candidate.context)
}

function buildMockRecommendation(
  type: AIRecommendationType,
  context: UserAIContext
): PersonalAIResponse["recommendation"] {
  const displayName = context.profile?.displayName || "Atleta"

  if (type === "workout_plan") {
    const weekdays =
      context.activePlan?.weekdays.length ? context.activePlan.weekdays.slice(0, 3) : [1, 3, 5]

    return {
      type,
      title: "Plano de treino sugerido para o proximo ciclo",
      summary:
        `${displayName}, com base na sua rotina atual, este plano prioriza consistencia e progressao gradual sem sobrecarga.`,
      payload: {
        plan: {
          name: "Plano IA - Proximo Ciclo",
          goal: context.profile?.goal ?? "health",
          description: "Divisao equilibrada para manter constancia semanal e evolucao controlada.",
          weekdays,
          status: "active",
        },
        workouts: weekdays.map((weekday, index) => ({
          name: `Treino ${String.fromCharCode(65 + index)} - Sessao ${index + 1}`,
          muscleGroup: index === 0 ? "Superior" : index === 1 ? "Inferior" : "Full body",
          weekday,
          exercises: [
            {
              name: index === 1 ? "Agachamento guiado" : "Supino com halteres",
              muscleGroup: index === 1 ? "Pernas" : "Peito",
              sets: 4,
              reps: "8-12",
              suggestedLoad: "moderada",
              restSeconds: 90,
              notes: "Manter execucao controlada e foco na tecnica.",
            },
            {
              name: "Remada sentada",
              muscleGroup: "Costas",
              sets: 3,
              reps: "10-12",
              suggestedLoad: "moderada",
              restSeconds: 75,
              notes: "Progressao de carga apenas com amplitude completa.",
            },
          ],
        })),
      },
    }
  }

  if (type === "nutrition_suggestion") {
    return {
      type,
      title: "Ajustes alimentares de alta aderencia",
      summary:
        "Recomendacoes gerais para melhorar consistencia sem restricoes extremas, alinhadas ao seu objetivo atual.",
      payload: {
        summary: "Foco em regularidade de horarios e distribuicao de proteina nas principais refeicoes.",
        attentionPoints: [
          "Evitar longos periodos sem refeicao em dias de treino.",
          "Monitorar dias com baixa hidratacao.",
        ],
        suggestions: [
          "Definir 2 horarios fixos para refeicoes-base.",
          "Preparar lanche de pre-treino com antecedencia.",
        ],
        mealIdeas: [
          "Iogurte natural com fruta e aveia.",
          "Arroz, feijao, frango e legumes.",
          "Sanduiche de frango desfiado com salada.",
        ],
        consistencyTips: [
          "Registrar refeicoes imediatamente apos consumir.",
          "Manter agua visivel durante o dia.",
        ],
      },
    }
  }

  if (type === "activity_suggestion") {
    return {
      type,
      title: "Atividades complementares para sua semana",
      summary: "Sugestoes leves para elevar gasto energetico e melhorar recuperacao ativa.",
      payload: {
        suggestions: [
          "2 caminhadas de 25 a 35 min em dias sem treino.",
          "1 sessao curta de mobilidade apos treino de membros inferiores.",
        ],
      },
    }
  }

  if (type === "workout_adjustment") {
    return {
      type,
      title: "Ajustes no plano atual",
      summary: "Pequenos ajustes de volume e descanso para melhorar aderencia e qualidade de execucao.",
      payload: {
        adjustments: [
          "Reduzir 1 serie nos exercicios finais quando energia estiver <= 2/5.",
          "Aumentar descanso para 90s em compostos mais exigentes.",
        ],
      },
    }
  }

  return {
    type,
    title: "Analise de progresso mensal",
    summary:
      "Seu historico mostra boa base de constancia. O proximo passo e estabilizar execucoes em dias planejados.",
    payload: {
      strengths: ["Frequencia de registros", "Evolucao gradual de rotina"],
      attentionPoints: ["Dias planejados sem execucao", "Regularidade de refeicoes"],
      nextMonthFocus: [
        "Atingir meta semanal minima de treinos.",
        "Manter pelo menos 1 atividade complementar em dia de descanso.",
      ],
    },
  }
}

function normalizeRecommendation(
  recommendation: Partial<AIRecommendation>,
  fallbackType: AIRecommendationType
): PersonalAIResponse["recommendation"] {
  return {
    type: recommendation.type ?? fallbackType,
    title: recommendation.title ?? "Recomendacao IA",
    summary: recommendation.summary ?? "Recomendacao gerada com base no seu contexto atual.",
    payload: typeof recommendation.payload === "object" && recommendation.payload !== null ? recommendation.payload : {},
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

async function generateWithOpenAI(payload: PersonalAIRequestPayload): Promise<PersonalAIResponse> {
  const contextJson = JSON.stringify(payload.context)
  const userPrompt = buildPersonalAIUserPrompt({
    action: payload.type,
    contextJson,
    additionalPrompt: payload.prompt,
  })

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        { role: "system", content: PERSONAL_AI_SYSTEM_PROMPT },
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
    throw new Error("OpenAI nao retornou texto parseavel.")
  }

  const parsed = JSON.parse(text) as Partial<AIRecommendation>

  return {
    recommendation: normalizeRecommendation(parsed, payload.type),
    source: "openai",
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown

    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: "Payload invalido para Personal IA." }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      const recommendation = buildMockRecommendation(payload.type, payload.context)
      return NextResponse.json({ recommendation, source: "mock" satisfies PersonalAIResponse["source"] })
    }

    try {
      const response = await generateWithOpenAI(payload)
      return NextResponse.json(response)
    } catch (openAIError) {
      console.warn("Falha na integracao OpenAI. Retornando mock.", openAIError)
      const recommendation = buildMockRecommendation(payload.type, payload.context)
      return NextResponse.json({ recommendation, source: "mock" satisfies PersonalAIResponse["source"] })
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno no Personal IA.",
      },
      { status: 500 }
    )
  }
}
