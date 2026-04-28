import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AINutritionSuggestionPayload } from "@/types/ai"

export function AINutritionSuggestion({ payload }: { payload: AINutritionSuggestionPayload }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Sugestao alimentar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{payload.summary}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-sm font-medium">Pontos de atencao</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
              {payload.attentionPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-sm font-medium">Sugestoes praticas</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
              {payload.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 p-3">
          <p className="text-sm font-medium">Ideias de refeicao</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
            {payload.mealIdeas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/70 p-3">
          <p className="text-sm font-medium">Dicas de consistencia</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
            {payload.consistencyTips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
