"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GROUP_POINTS } from "@/lib/groupScore"

const POINT_RULES = [
  { key: "workout_completed", label: "Treino concluido" },
  { key: "workout_photo", label: "Foto de treino" },
  { key: "activity_completed", label: "Atividade registrada" },
  { key: "activity_photo", label: "Foto de atividade" },
  { key: "workout_checkin", label: "Check-in de treino" },
] as const

export function PointsGuideCard() {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Como pontuar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {POINT_RULES.map((rule) => (
          <div key={rule.key} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
            <span className="text-muted-foreground">{rule.label}</span>
            <Badge>{GROUP_POINTS[rule.key]} pts</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
