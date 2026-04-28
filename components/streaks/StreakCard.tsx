"use client"

import { Flame, Target, TrendUp } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDatePtBr } from "@/lib/date"
import type { StreakSummary } from "@/types/streak"

const STATUS_LABELS = {
  completed: "Cumprido hoje",
  missed: "Dia perdido",
  rest_day: "Dia de descanso",
  pending: "Pendente hoje",
} as const

export function StreakCard({ summary }: { summary: StreakSummary }) {
  return (
    <Card className="border-primary/25 bg-primary/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="inline-flex items-center gap-2">
            <Flame className="size-5 text-primary" weight="fill" />
            Ofensiva
          </span>
          <Badge variant="secondary">{STATUS_LABELS[summary.todayStatus]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/70 bg-card p-3">
            <p className="text-xs text-muted-foreground">Atual</p>
            <p className="text-2xl font-semibold">{summary.currentStreak}</p>
            <p className="text-xs text-muted-foreground">treinos seguidos</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-3">
            <p className="text-xs text-muted-foreground">Melhor</p>
            <p className="text-2xl font-semibold">{summary.longestStreak}</p>
            <p className="text-xs text-muted-foreground">recorde pessoal</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Target className="size-4" />
              Progresso semanal
            </span>
            <span className="font-medium text-foreground">
              {summary.weeklyCompleted}/{summary.weeklyPlanned}
            </span>
          </div>
          <Progress value={summary.weeklyPercentage} />
          <p className="text-xs text-muted-foreground">{summary.weeklyPercentage}% da meta da semana</p>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-1">
            <TrendUp className="size-4" />
            Proximo treino planejado:{" "}
            <span className="font-medium text-foreground">
              {summary.nextPlannedWorkoutDate ? formatDatePtBr(summary.nextPlannedWorkoutDate) : "-"}
            </span>
          </p>
          {summary.lastMissedDate ? (
            <p>
              Ultimo dia perdido: <span className="font-medium text-foreground">{formatDatePtBr(summary.lastMissedDate)}</span>
            </p>
          ) : (
            <p>Nenhum dia planejado perdido no periodo recente.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
