"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { WaterGoal } from "@/types/water"

const INTERVAL_OPTIONS = [30, 60, 90, 120] as const

interface ReminderFormValues {
  reminderEnabled: boolean
  reminderIntervalMinutes: number
  startReminderTime: string
  endReminderTime: string
}

export function WaterReminderSettings({
  goal,
  isSubmitting,
  onSubmit,
}: {
  goal: WaterGoal
  isSubmitting?: boolean
  onSubmit: (input: ReminderFormValues) => Promise<void> | void
}) {
  const [values, setValues] = useState<ReminderFormValues>({
    reminderEnabled: goal.reminderEnabled,
    reminderIntervalMinutes: goal.reminderIntervalMinutes,
    startReminderTime: goal.startReminderTime,
    endReminderTime: goal.endReminderTime,
  })

  useEffect(() => {
    setValues({
      reminderEnabled: goal.reminderEnabled,
      reminderIntervalMinutes: goal.reminderIntervalMinutes,
      startReminderTime: goal.startReminderTime,
      endReminderTime: goal.endReminderTime,
    })
  }, [goal])

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alertas de hidratacao</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
          <span className="text-sm">Ativar lembretes</span>
          <input
            type="checkbox"
            checked={values.reminderEnabled}
            onChange={(event) => setValues((prev) => ({ ...prev, reminderEnabled: event.target.checked }))}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Intervalo</p>
            <Select
              value={String(values.reminderIntervalMinutes)}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  reminderIntervalMinutes: Number(event.target.value),
                }))
              }
            >
              {INTERVAL_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item} min
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Inicio</p>
            <Input
              type="time"
              value={values.startReminderTime}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  startReminderTime: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Fim</p>
          <Input
            type="time"
            value={values.endReminderTime}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                endReminderTime: event.target.value,
              }))
            }
          />
        </div>

        <Button type="button" className="h-11 w-full" disabled={isSubmitting} onClick={() => onSubmit(values)}>
          Salvar alertas
        </Button>
      </CardContent>
    </Card>
  )
}
