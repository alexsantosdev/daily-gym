"use client"

import { Drop } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getWaterProgressStatus } from "@/lib/water"

export function WaterProgressCard({
  consumedMl,
  dailyGoalMl,
}: {
  consumedMl: number
  dailyGoalMl: number
}) {
  const status = getWaterProgressStatus(consumedMl, dailyGoalMl)

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Consumo de hoje</CardTitle>
          <Badge className="bg-primary/15 text-primary">{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <p className="text-3xl font-semibold tracking-tight">{consumedMl} ml</p>
          <p className="text-sm text-muted-foreground">Meta {dailyGoalMl} ml</p>
        </div>
        <Progress value={Math.min(100, status.percentage)} className="h-3 bg-primary/15" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Drop className="size-3.5 text-primary" weight="fill" />
            {status.message}
          </span>
          <span>{Math.min(status.percentage, 999)}%</span>
        </div>
      </CardContent>
    </Card>
  )
}
