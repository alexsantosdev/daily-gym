"use client"

import Image from "next/image"
import Link from "next/link"

import { ArrowUpRight, Barbell, Crown, Fire, Sword } from "@phosphor-icons/react"

import { ShareButton } from "@/components/share/ShareButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { buildCompetitionShareData } from "@/lib/share"
import type { GroupChallengeBannerData } from "@/types/group"

interface GroupChallengeBannerProps {
  data: GroupChallengeBannerData
}

function buildMessage(data: GroupChallengeBannerData) {
  if (data.mode === "leading") {
    return {
      title: "🏆 Voce esta liderando a competicao.",
      description:
        (data.pointsDiff ?? 0) > 0
          ? `Continue assim para nao deixar ninguem encostar. Vantagem de ${data.pointsDiff} pts para o 2º colocado.`
          : "Continue pontuando para abrir vantagem na semana.",
    }
  }

  if (data.mode === "tied") {
    return {
      title: `⚔️ Voce esta empatado com ${data.rivalName ?? "seu rival"}.`,
      description: "Um check-in pode te colocar na frente.",
    }
  }

  if (data.mode === "trailing") {
    return {
      title: `🔥 Voce esta atras de ${data.rivalName ?? "seu rival"}.`,
      description: `Faltam ${data.pointsDiff ?? 0} pontos para ultrapassar. Registre um treino hoje e vire o jogo.`,
    }
  }

  if (data.mode === "starting") {
    return {
      title: "A competicao comecou.",
      description: "Faca seu primeiro check-in para abrir vantagem.",
    }
  }

  return {
    title: "Crie uma competicao com um amigo.",
    description: "Ative o modo confronto para ganhar mais consistencia.",
  }
}

export function GroupChallengeBanner({ data }: GroupChallengeBannerProps) {
  const message = buildMessage(data)
  const shareData =
    data.groupId && data.groupName && data.userRank && typeof data.userPoints === "number"
      ? buildCompetitionShareData({
          userName: "Atleta",
          groupName: data.groupName,
          rank: data.userRank,
          points: data.userPoints,
          rivalName: data.rivalName,
          rivalPoints: data.rivalPoints,
          pointsDiff: data.pointsDiff,
          rivalPhotoUrl: data.rivalPhotoURL ?? undefined,
        })
      : null

  if (data.mode === "cta") {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm font-medium">{message.title}</p>
          <p className="text-sm text-muted-foreground">{message.description}</p>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/groups">
              Abrir competicao
              <ArrowUpRight className="ml-1 size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/25 bg-primary/[0.04]">
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Competicao</Badge>
          <Badge variant="outline">Grupo: {data.groupName}</Badge>
          <Badge variant="outline">Voce #{data.userRank ?? "-"}</Badge>
          {shareData ? <ShareButton cardType="competition" data={shareData} size="xs" /> : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <p className="text-sm font-semibold">{message.title}</p>
            <p className="text-sm text-muted-foreground">{message.description}</p>
            <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:flex-wrap">
              {data.groupId ? (
                <Button asChild size="sm" className="h-10 w-full min-[430px]:w-auto">
                  <Link href={`/groups/${data.groupId}`}>
                    Abrir competicao
                    <ArrowUpRight className="ml-1 size-4" />
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline" className="h-10 w-full min-[430px]:w-auto">
                <Link href="/workouts?start=1">
                  <Barbell className="mr-1 size-4" />
                  Iniciar treino
                </Link>
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 bg-card/85 p-3">
            <div className="flex items-start justify-between gap-2 text-xs">
              <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Fire className="size-3.5 text-primary" />
                Voce
              </span>
              <span className="font-semibold">{data.userPoints ?? 0} pts</span>
            </div>
            <div className="flex items-start justify-between gap-2 text-xs">
              <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Crown className="size-3.5 text-primary" />
                <span className="truncate">Lider ({data.leaderName ?? "-"})</span>
              </span>
              <span className="font-semibold">{data.leaderPoints ?? 0} pts</span>
            </div>
            {data.rivalName ? (
              <div className="flex items-start justify-between gap-2 text-xs">
                <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                  {data.rivalPhotoURL ? (
                    <Image
                      src={data.rivalPhotoURL}
                      alt={data.rivalName}
                      width={20}
                      height={20}
                      unoptimized
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <Sword className="size-3.5 text-primary" />
                  )}
                  <span className="truncate">Rival da semana ({data.rivalName})</span>
                </span>
                <span className="font-semibold">{data.rivalPoints ?? 0} pts</span>
              </div>
            ) : null}
            {typeof data.pointsDiff === "number" ? (
              <div className="mt-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-xs">
                Diferenca: <span className="font-semibold">{Math.max(0, data.pointsDiff)} pts</span>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
