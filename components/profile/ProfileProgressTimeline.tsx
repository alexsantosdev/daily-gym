import Image from "next/image"

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

export function ProfileProgressTimeline({ checkins }: { checkins: UserMonthlyCheckin[] }) {
  if (checkins.length === 0) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Evolucao mensal</CardTitle>
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
        <CardTitle>Evolucao mensal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {checkins.map((checkin) => (
          <div key={checkin.id} className="rounded-xl border border-border/70 bg-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {monthLabelByNumber[checkin.month] ?? checkin.month}/{checkin.year}
                </p>
                <p className="text-xs text-muted-foreground">Peso: {checkin.weightKg.toFixed(1)} kg</p>
              </div>
              <p className="text-xs text-muted-foreground">Atualizado em {formatDatePtBr(checkin.updatedAt.slice(0, 10))}</p>
            </div>

            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <p>Cintura: {checkin.waistCm ? `${checkin.waistCm} cm` : "-"}</p>
              <p>Peitoral: {checkin.chestCm ? `${checkin.chestCm} cm` : "-"}</p>
              <p>Quadril: {checkin.hipCm ? `${checkin.hipCm} cm` : "-"}</p>
              <p>Coxa: {checkin.thighCm ? `${checkin.thighCm} cm` : "-"}</p>
              <p>Braco: {checkin.armCm ? `${checkin.armCm} cm` : "-"}</p>
              <p>Gordura corporal: {checkin.bodyFatPercentage ? `${checkin.bodyFatPercentage}%` : "-"}</p>
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
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
