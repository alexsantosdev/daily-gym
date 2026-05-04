"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function WaterGoalForm({
  valueMl,
  isSubmitting,
  onSubmit,
}: {
  valueMl: number
  isSubmitting?: boolean
  onSubmit: (dailyGoalMl: number) => Promise<void> | void
}) {
  const [goalMl, setGoalMl] = useState(String(valueMl))

  useEffect(() => {
    setGoalMl(String(valueMl))
  }, [valueMl])

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Meta diaria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="number"
          min={250}
          step={50}
          value={goalMl}
          onChange={(event) => setGoalMl(event.target.value)}
          placeholder="Ex: 2000"
        />
        <Button
          type="button"
          className="h-11 w-full"
          disabled={isSubmitting}
          onClick={() => onSubmit(Math.max(250, Number(goalMl) || 0))}
        >
          Salvar meta
        </Button>
      </CardContent>
    </Card>
  )
}
