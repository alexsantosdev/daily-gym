"use client"

import { Trophy } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { GroupMemberScore } from "@/lib/groupScore"

export function GroupLeaderboard({
  scores,
  currentUserId,
}: {
  scores: GroupMemberScore[]
  currentUserId?: string
}) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <Trophy className="size-5 text-primary" weight="fill" />
          Placar semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem pontuacoes nesta semana.</p>
        ) : (
          scores.map((score) => (
            <div
              key={score.memberId}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border border-border/70 p-3",
                score.memberId === currentUserId && "border-primary/35 bg-primary/10"
              )}
            >
              <div>
                <p className="text-sm font-medium">
                  #{score.rank} {score.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Treinos: {score.workoutsCompleted} • Atividades: {score.activitiesCompleted} • Fotos:{" "}
                  {score.workoutPhotos + score.activityPhotos}
                </p>
              </div>
              <Badge>{score.totalPoints} pts</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
