"use client"

import Link from "next/link"

import { Users } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDatePtBr } from "@/lib/date"
import type { Group } from "@/types/group"

interface GroupCardProps {
  group: Group
  membersCount: number
  leaderName?: string
  leaderPoints?: number
}

export function GroupCard({ group, membersCount, leaderName, leaderPoints }: GroupCardProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{group.name}</span>
          <Badge variant="secondary">{group.status === "active" ? "Ativo" : "Arquivado"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4" />
          <span>{membersCount} membros</span>
        </div>
        <p className="text-xs text-muted-foreground">Codigo: {group.inviteCode}</p>
        {group.endDate ? (
          <p className="text-xs text-muted-foreground">Encerra em: {formatDatePtBr(group.endDate)}</p>
        ) : null}
        <div className="rounded-lg border border-border/70 bg-muted/30 p-2 text-xs">
          <p className="font-medium text-foreground">Lider da semana</p>
          <p className="text-muted-foreground">
            {leaderName ?? "Sem dados"} {typeof leaderPoints === "number" ? `• ${leaderPoints} pts` : ""}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href={`/groups/${group.id}`}>Abrir competicao</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
