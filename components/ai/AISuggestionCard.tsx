import { CheckCircle, Prohibit } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AIRecommendation } from "@/types/ai"

interface AISuggestionCardProps {
  recommendation: AIRecommendation
  onApply: (recommendation: AIRecommendation) => Promise<void>
  onReject: (recommendation: AIRecommendation) => Promise<void>
}

const statusLabel: Record<AIRecommendation["status"], string> = {
  draft: "Rascunho",
  accepted: "Aceita",
  rejected: "Rejeitada",
  applied: "Aplicada",
}

const typeLabel: Record<AIRecommendation["type"], string> = {
  workout_plan: "Plano de treino",
  workout_adjustment: "Ajuste de treino",
  activity_suggestion: "Atividade",
  nutrition_suggestion: "Alimentacao",
  progress_analysis: "Analise",
}

export function AISuggestionCard({ recommendation, onApply, onReject }: AISuggestionCardProps) {
  const canAct = recommendation.status === "draft" || recommendation.status === "accepted"

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>{recommendation.title}</span>
          <span className="rounded-full border border-border/70 px-2 py-1 text-xs text-muted-foreground">
            {typeLabel[recommendation.type]} · {statusLabel[recommendation.status]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{recommendation.summary}</p>

        {canAct ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={() => void onApply(recommendation)}>
              <CheckCircle className="mr-1 size-4" />
              {recommendation.type === "workout_plan" ? "Criar plano no app" : "Aceitar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void onReject(recommendation)}>
              <Prohibit className="mr-1 size-4" />
              Rejeitar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
