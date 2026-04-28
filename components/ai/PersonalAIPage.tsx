"use client"

import { useEffect, useState } from "react"

import { AISuggestionCard } from "@/components/ai/AISuggestionCard"
import { AINutritionSuggestion } from "@/components/ai/AINutritionSuggestion"
import { AIWorkoutPlanPreview } from "@/components/ai/AIWorkoutPlanPreview"
import { PersonalAIChat } from "@/components/ai/PersonalAIChat"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import {
  acceptRecommendation,
  applyWorkoutPlanRecommendation,
  buildUserAIContext,
  listAIRecommendationsByUser,
  rejectRecommendation,
  requestAIRecommendation,
  saveAIRecommendation,
} from "@/services/personalAIService"
import type {
  AIRecommendation,
  AIRecommendationType,
  AINutritionSuggestionPayload,
  AIWorkoutPlanPayload,
  UserAIContext,
} from "@/types/ai"

function isWorkoutPlanPayload(payload: unknown): payload is AIWorkoutPlanPayload {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return Boolean(candidate.plan) && Array.isArray(candidate.workouts)
}

function isNutritionPayload(payload: unknown): payload is AINutritionSuggestionPayload {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.attentionPoints) &&
    Array.isArray(candidate.suggestions)
  )
}

export function PersonalAIPage() {
  const { user } = useAuth()
  const [context, setContext] = useState<UserAIContext | null>(null)
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      if (!user?.uid) {
        if (isMounted) {
          setContext(null)
          setRecommendations([])
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)

      try {
        const [nextContext, nextRecommendations] = await Promise.all([
          buildUserAIContext(user.uid),
          listAIRecommendationsByUser(user.uid),
        ])

        if (!isMounted) {
          return
        }

        setContext(nextContext)
        setRecommendations(nextRecommendations)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar Personal IA.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [user?.uid])

  const aiConsentEnabled = context?.profile?.aiConsent ?? false
  const latestRecommendation = recommendations[0] ?? null
  const goalLabelMap = {
    hypertrophy: "Hipertrofia",
    fat_loss: "Emagrecimento",
    strength: "Forca",
    maintenance: "Manutencao",
    conditioning: "Condicionamento",
    health: "Saude",
    other: "Outro",
  } as const
  const experienceLabelMap = {
    beginner: "Iniciante",
    intermediate: "Intermediario",
    advanced: "Avancado",
  } as const

  const refreshRecommendations = async () => {
    if (!user?.uid) {
      return
    }

    const nextRecommendations = await listAIRecommendationsByUser(user.uid)
    setRecommendations(nextRecommendations)
  }

  const generateRecommendation = async (type: AIRecommendationType, prompt?: string) => {
    if (!user?.uid) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await requestAIRecommendation({ userId: user.uid, type, prompt })
      await saveAIRecommendation({
        userId: user.uid,
        type: response.recommendation.type,
        title: response.recommendation.title,
        summary: response.recommendation.summary,
        payload: response.recommendation.payload,
        status: "draft",
      })

      const nextContext = await buildUserAIContext(user.uid)
      setContext(nextContext)
      await refreshRecommendations()
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Nao foi possivel gerar recomendacao da IA."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Personal IA"
        description="Recomendacoes personalizadas com base no seu perfil, historico e evolucao."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Resumo do perfil IA</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            <p>
              Objetivo atual:{" "}
              <span className="font-medium text-foreground">
                {context?.profile?.goal ? goalLabelMap[context.profile.goal] : "-"}
              </span>
            </p>
            <p>
              Nivel:{" "}
              <span className="font-medium text-foreground">
                {context?.profile?.experienceLevel
                  ? (experienceLabelMap[
                      context.profile.experienceLevel as keyof typeof experienceLabelMap
                    ] ?? context.profile.experienceLevel)
                  : "-"}
              </span>
            </p>
            <p>
              Meta semanal:{" "}
              <span className="font-medium text-foreground">
                {context?.stats.weeklyCompletion
                  ? `${context.stats.weeklyCompletion} treinos`
                  : "-"}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            <p>
              Treinos executados (30d): <span className="font-medium text-foreground">{context?.stats.workoutsExecutedLast30d ?? 0}</span>
            </p>
            <p>
              Atividades (30d): <span className="font-medium text-foreground">{context?.stats.activitiesLast30d ?? 0}</span>
            </p>
            <p>
              Ofensiva atual: <span className="font-medium text-foreground">{context?.stats.currentStreak ?? 0}</span>
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">
              Consentimento IA: {aiConsentEnabled ? "ativo" : "desativado"}. {!aiConsentEnabled ? "Ative no perfil para gerar recomendacoes personalizadas." : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button disabled={isSubmitting || !aiConsentEnabled} onClick={() => void generateRecommendation("workout_plan")}>
          Gerar plano de treino
        </Button>
        <Button
          variant="outline"
          disabled={isSubmitting || !aiConsentEnabled}
          onClick={() => void generateRecommendation("progress_analysis")}
        >
          Analisar meu mes
        </Button>
        <Button
          variant="outline"
          disabled={isSubmitting || !aiConsentEnabled}
          onClick={() => void generateRecommendation("workout_adjustment")}
        >
          Sugerir ajustes
        </Button>
      </div>

      <PersonalAIChat isSubmitting={isSubmitting} onGenerate={generateRecommendation} />

      {latestRecommendation?.type === "workout_plan" && isWorkoutPlanPayload(latestRecommendation.payload) ? (
        <AIWorkoutPlanPreview payload={latestRecommendation.payload} />
      ) : null}

      {latestRecommendation?.type === "nutrition_suggestion" &&
      isNutritionPayload(latestRecommendation.payload) ? (
        <AINutritionSuggestion payload={latestRecommendation.payload} />
      ) : null}

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Recomendacoes anteriores</h3>
        {recommendations.length === 0 ? (
          <Card className="border-border/70">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Nenhuma recomendacao gerada ainda.</p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((recommendation) => (
            <AISuggestionCard
              key={recommendation.id}
              recommendation={recommendation}
              onApply={async (item) => {
                setError(null)
                try {
                  if (item.type === "workout_plan") {
                    await applyWorkoutPlanRecommendation(item.id)
                  } else {
                    await acceptRecommendation(item.id)
                  }
                  await refreshRecommendations()
                } catch (applyError) {
                  setError(
                    applyError instanceof Error
                      ? applyError.message
                      : "Falha ao aplicar recomendacao."
                  )
                }
              }}
              onReject={async (item) => {
                setError(null)
                try {
                  await rejectRecommendation(item.id)
                  await refreshRecommendations()
                } catch (rejectError) {
                  setError(
                    rejectError instanceof Error
                      ? rejectError.message
                      : "Falha ao rejeitar recomendacao."
                  )
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
