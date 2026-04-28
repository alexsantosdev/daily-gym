"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { GroupMemberScore } from "@/lib/groupScore"

export function GroupMemberProgress({ scores }: { scores: GroupMemberScore[] }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Progresso dos membros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de progresso.</p>
        ) : (
          scores.map((score) => (
            <div key={score.memberId} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">{score.name}</span>
                <span className="text-muted-foreground">{score.weeklyCompletionRate}%</span>
              </div>
              <Progress value={score.weeklyCompletionRate} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
