"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AIRecommendationType } from "@/types/ai"

interface PersonalAIChatProps {
  isSubmitting?: boolean
  onGenerate: (type: AIRecommendationType, prompt?: string) => Promise<void>
}

const recommendationTypeLabels: Record<AIRecommendationType, string> = {
  workout_plan: "Plano de treino",
  workout_adjustment: "Ajuste de treino",
  activity_suggestion: "Sugestao de atividade",
  nutrition_suggestion: "Sugestao alimentar",
  progress_analysis: "Analise de evolucao",
}

export function PersonalAIChat({ isSubmitting, onGenerate }: PersonalAIChatProps) {
  const [type, setType] = useState<AIRecommendationType>("workout_plan")
  const [prompt, setPrompt] = useState("")

  const buttonLabel = useMemo(() => {
    if (isSubmitting) {
      return "Gerando recomendacao..."
    }

    return `Gerar ${recommendationTypeLabels[type].toLowerCase()}`
  }, [isSubmitting, type])

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Conversar com Personal IA</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-recommendation-type">Tipo de recomendacao</Label>
          <Select
            id="ai-recommendation-type"
            value={type}
            onChange={(event) => setType(event.target.value as AIRecommendationType)}
          >
            {Object.entries(recommendationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-prompt">Contexto extra (opcional)</Label>
          <Textarea
            id="ai-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ex: estou com pouco tempo essa semana e quero algo mais curto"
          />
        </div>

        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => void onGenerate(type, prompt || undefined)}
        >
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
