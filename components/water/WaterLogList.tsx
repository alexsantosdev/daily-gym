"use client"

import { PencilSimple, Trash } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTimePtBr } from "@/lib/date"
import type { WaterLog } from "@/types/water"

function getSourceLabel(source?: WaterLog["source"]) {
  if (source === "quick_action") {
    return "Acao rapida"
  }
  if (source === "reminder") {
    return "Lembrete"
  }
  return "Manual"
}

export function WaterLogList({
  logs,
  onEdit,
  onDelete,
}: {
  logs: WaterLog[]
  onEdit: (log: WaterLog) => void
  onDelete: (logId: string) => void
}) {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Registros do dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
            Ainda sem registros hoje.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{log.amountMl} ml</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{getSourceLabel(log.source)}</Badge>
                    <span className="text-xs text-muted-foreground">{formatTimePtBr(log.createdAt)}</span>
                  </div>
                  {log.notes ? <p className="mt-1 text-xs text-muted-foreground">{log.notes}</p> : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => onEdit(log)}>
                    <PencilSimple className="size-4" />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => onDelete(log.id)}>
                    <Trash className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
