import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDatePtBr } from "@/lib/date"
import type { UserMonthlyCheckin } from "@/types/profile"

const monthLabelByNumber: Record<number, string> = {
  1: "Jan",
  2: "Fev",
  3: "Mar",
  4: "Abr",
  5: "Mai",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Set",
  10: "Out",
  11: "Nov",
  12: "Dez",
}

function formatMeasure(value?: number, unit = "cm") {
  if (typeof value !== "number") {
    return "-"
  }

  return `${value} ${unit}`
}

function buildMonthLabel(checkin: UserMonthlyCheckin) {
  return `${monthLabelByNumber[checkin.month] ?? checkin.month}/${checkin.year}`
}

export function ProfileProgressTimeline({ checkins }: { checkins: UserMonthlyCheckin[] }) {
  const ordered = [...checkins].sort((a, b) => {
    return b.updatedAt.localeCompare(a.updatedAt)
  })

  if (ordered.length === 0) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Historico mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum check-in mensal registrado ainda.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Historico mensal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ordered.map((checkin, index) => {
          const previous = ordered[index + 1]
          const weightDelta = previous ? Number((checkin.weightKg - previous.weightKg).toFixed(1)) : null

          return (
            <article key={checkin.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{buildMonthLabel(checkin)}</p>
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {formatDatePtBr(checkin.updatedAt.slice(0, 10))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{checkin.weightKg.toFixed(1)} kg</Badge>
                  {weightDelta !== null ? (
                    <Badge variant="outline">
                      {weightDelta > 0 ? "+" : ""}
                      {weightDelta.toFixed(1)} kg
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <p>Cintura: {formatMeasure(checkin.waistCm)}</p>
                <p>Peitoral: {formatMeasure(checkin.chestCm)}</p>
                <p>Quadril: {formatMeasure(checkin.hipCm)}</p>
                <p>Braco: {formatMeasure(checkin.armCm)}</p>
                <p>Coxa: {formatMeasure(checkin.thighCm)}</p>
                <p>Gordura: {formatMeasure(checkin.bodyFatPercentage, "%")}</p>
              </div>

              {checkin.progressPhotoUrl ? (
                <Image
                  src={checkin.progressPhotoUrl}
                  alt="Foto de progresso"
                  width={1200}
                  height={640}
                  unoptimized
                  className="mt-3 h-40 w-full rounded-xl object-cover"
                />
              ) : null}

              {checkin.adherenceNote || checkin.objectiveUpdate ? (
                <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                  {checkin.adherenceNote ? <p>Aderencia: {checkin.adherenceNote}</p> : null}
                  {checkin.objectiveUpdate ? <p>Objetivo: {checkin.objectiveUpdate}</p> : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </CardContent>
    </Card>
  )
}
