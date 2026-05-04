"use client"

import { Plus } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const QUICK_AMOUNTS = [200, 300, 500] as const

export function WaterQuickActions({
  onQuickAdd,
  onCustomAdd,
  isSubmitting,
}: {
  onQuickAdd: (amountMl: number) => void
  onCustomAdd: () => void
  isSubmitting?: boolean
}) {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Registro rapido</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            type="button"
            className="h-12 rounded-xl"
            disabled={isSubmitting}
            onClick={() => onQuickAdd(amount)}
          >
            <Plus className="mr-1 size-4" />
            {amount} ml
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl"
          disabled={isSubmitting}
          onClick={onCustomAdd}
        >
          Personalizado
        </Button>
      </CardContent>
    </Card>
  )
}
