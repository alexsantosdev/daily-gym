import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

function scoreLabel(score: number) {
  if (score >= 80) {
    return "Excelente"
  }

  if (score >= 60) {
    return "Bom"
  }

  if (score >= 40) {
    return "Regular"
  }

  return "Atenção"
}

export function ConsistencyScore({
  score,
  activeDays,
}: {
  score: number
  activeDays: number
}) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Score de consistencia</span>
          <Badge variant="secondary">{scoreLabel(score)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold">{score}%</p>
        <Progress value={score} />
        <p className="text-xs text-muted-foreground">Dias ativos no periodo: {activeDays}</p>
      </CardContent>
    </Card>
  )
}
