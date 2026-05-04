"use client"

import { BellRinging, Drop } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function WaterReminderBanner({
  open,
  message,
  onRegister,
  onDismiss,
  isSubmitting,
}: {
  open: boolean
  message: string
  onRegister: () => Promise<void>
  onDismiss: () => void
  isSubmitting?: boolean
}) {
  if (!open) {
    return null
  }

  return (
    <Card className="border-primary/40 bg-primary/10">
      <CardContent className="space-y-3 pt-4">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <BellRinging className="size-4 text-primary" />
          {message}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" className="h-11" disabled={isSubmitting} onClick={onRegister}>
            <Drop className="mr-1 size-4" weight="fill" />
            Registrar 300 ml
          </Button>
          <Button type="button" variant="outline" className="h-11" disabled={isSubmitting} onClick={onDismiss}>
            Ignorar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
