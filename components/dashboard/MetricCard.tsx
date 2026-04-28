import { ArrowUpRight } from "@phosphor-icons/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function MetricCard({
  title,
  value,
  subtitle,
  progress,
}: {
  title: string
  value: string | number
  subtitle?: string
  progress?: number
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-1.5">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <ArrowUpRight className="size-4 text-primary" />
        </div>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        {typeof progress === "number" ? <Progress value={progress} /> : null}
      </CardContent>
    </Card>
  )
}
