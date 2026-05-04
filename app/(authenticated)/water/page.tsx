"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { X } from "@phosphor-icons/react"

import { PageHeader } from "@/components/layout/page-header"
import { WaterGoalForm } from "@/components/water/WaterGoalForm"
import { WaterLogList } from "@/components/water/WaterLogList"
import { WaterProgressCard } from "@/components/water/WaterProgressCard"
import { WaterQuickActions } from "@/components/water/WaterQuickActions"
import { WaterReminderBanner } from "@/components/water/WaterReminderBanner"
import { WaterReminderSettings } from "@/components/water/WaterReminderSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/useAuth"
import { useWaterReminder } from "@/hooks/useWaterReminder"
import { getLastNDates, todayIsoDate } from "@/lib/date"
import { buildWaterRangeReport } from "@/lib/water"
import {
  addWaterLog,
  createOrUpdateWaterGoal,
  deleteWaterLog,
  ensureWaterGoal,
  getTodayWaterSummary,
  getWaterLogsByRange,
  updateWaterLog,
} from "@/services/waterService"
import type { WaterGoal, WaterLog, WaterRangeReport, WaterTodaySummary } from "@/types/water"

function createEmptySummary(): WaterTodaySummary {
  return {
    dailyGoalMl: 2000,
    consumedMl: 0,
    remainingMl: 2000,
    percentage: 0,
    logs: [],
  }
}

export default function WaterPage() {
  const { user } = useAuth()

  const [goal, setGoal] = useState<WaterGoal | null>(null)
  const [summary, setSummary] = useState<WaterTodaySummary>(createEmptySummary())
  const [report, setReport] = useState<WaterRangeReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isLogSheetOpen, setIsLogSheetOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<WaterLog | null>(null)
  const [logAmountMl, setLogAmountMl] = useState("300")
  const [logNotes, setLogNotes] = useState("")

  const loadWaterData = useCallback(async () => {
    if (!user?.uid) {
      setGoal(null)
      setSummary(createEmptySummary())
      setReport(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const ensuredGoal = await ensureWaterGoal(user.uid)
      const todaySummary = await getTodayWaterSummary(user.uid)
      const dates = getLastNDates(14)
      const rangeLogs = await getWaterLogsByRange(user.uid, dates[0], dates[dates.length - 1])
      const rangeReport = buildWaterRangeReport(
        rangeLogs,
        ensuredGoal.dailyGoalMl,
        dates[0],
        dates[dates.length - 1]
      )

      setGoal(ensuredGoal)
      setSummary(todaySummary)
      setReport(rangeReport)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Falha ao carregar hidratacao.")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadWaterData()
  }, [loadWaterData])

  const quickAdd = useCallback(
    async (amountMl: number, source: "quick_action" | "reminder" = "quick_action") => {
      if (!user?.uid) {
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        await addWaterLog({
          userId: user.uid,
          date: todayIsoDate(),
          amountMl,
          source,
        })
        await loadWaterData()
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Nao foi possivel registrar consumo.")
      } finally {
        setIsSubmitting(false)
      }
    },
    [loadWaterData, user]
  )

  const reminder = useWaterReminder({
    userId: user?.uid,
    goal,
    onRegister300Ml: async () => {
      await quickAdd(300, "reminder")
    },
  })

  const openCustomLogSheet = useCallback(() => {
    setEditingLog(null)
    setLogAmountMl("300")
    setLogNotes("")
    setIsLogSheetOpen(true)
  }, [])

  const openEditLogSheet = useCallback((log: WaterLog) => {
    setEditingLog(log)
    setLogAmountMl(String(log.amountMl))
    setLogNotes(log.notes ?? "")
    setIsLogSheetOpen(true)
  }, [])

  const submitLogSheet = useCallback(async () => {
    if (!user?.uid) {
      return
    }

    const amount = Math.max(1, Number(logAmountMl) || 0)

    setIsSubmitting(true)
    setError(null)

    try {
      if (editingLog) {
        await updateWaterLog(editingLog.id, {
          amountMl: amount,
          notes: logNotes.trim() || undefined,
          source: "manual",
        })
      } else {
        await addWaterLog({
          userId: user.uid,
          date: todayIsoDate(),
          amountMl: amount,
          source: "manual",
          notes: logNotes.trim() || undefined,
        })
      }

      setIsLogSheetOpen(false)
      setEditingLog(null)
      await loadWaterData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Nao foi possivel salvar registro.")
    } finally {
      setIsSubmitting(false)
    }
  }, [editingLog, loadWaterData, logAmountMl, logNotes, user])

  const reportItems = useMemo(
    () =>
      (report?.daily ?? []).map((day) => ({
        ...day,
        width: goal?.dailyGoalMl ? Math.min(100, Math.round((day.consumedMl / goal.dailyGoalMl) * 100)) : 0,
      })),
    [goal, report]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hidratacao"
        description="Defina sua meta de agua, registre consumos e mantenha alertas durante o dia."
      />

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <WaterReminderBanner
        open={reminder.visible}
        message={reminder.message}
        onRegister={reminder.register300Ml}
        onDismiss={reminder.dismiss}
        isSubmitting={isSubmitting}
      />

      {isLoading ? (
        <>
          <Skeleton className="h-36" />
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </>
      ) : (
        <>
          <WaterProgressCard consumedMl={summary.consumedMl} dailyGoalMl={summary.dailyGoalMl} />

          <WaterQuickActions
            onQuickAdd={(amount) => void quickAdd(amount)}
            onCustomAdd={openCustomLogSheet}
            isSubmitting={isSubmitting}
          />

          <WaterLogList
            logs={summary.logs}
            onEdit={openEditLogSheet}
            onDelete={(logId) => {
              void (async () => {
                setIsSubmitting(true)
                try {
                  await deleteWaterLog(logId)
                  await loadWaterData()
                } finally {
                  setIsSubmitting(false)
                }
              })()
            }}
          />

          {goal ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <WaterGoalForm
                valueMl={goal.dailyGoalMl}
                isSubmitting={isSubmitting}
                onSubmit={async (dailyGoalMl) => {
                  if (!user?.uid) {
                    return
                  }

                  setIsSubmitting(true)

                  try {
                    await createOrUpdateWaterGoal({ userId: user.uid, dailyGoalMl })
                    await loadWaterData()
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />

              <WaterReminderSettings
                goal={goal}
                isSubmitting={isSubmitting}
                onSubmit={async (settings) => {
                  if (!user?.uid) {
                    return
                  }

                  setIsSubmitting(true)

                  try {
                    await createOrUpdateWaterGoal({
                      userId: user.uid,
                      dailyGoalMl: goal.dailyGoalMl,
                      reminderEnabled: settings.reminderEnabled,
                      reminderIntervalMinutes: settings.reminderIntervalMinutes,
                      startReminderTime: settings.startReminderTime,
                      endReminderTime: settings.endReminderTime,
                    })
                    await loadWaterData()
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />
            </div>
          ) : null}

          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-3 pt-4">
              <h3 className="text-base font-semibold">Relatorio simples (14 dias)</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <p className="rounded-xl border border-border/70 bg-background/70 p-2 text-sm">
                  <span className="block text-xs text-muted-foreground">Media diaria</span>
                  <span className="font-semibold">{report?.dailyAverageMl ?? 0} ml</span>
                </p>
                <p className="rounded-xl border border-border/70 bg-background/70 p-2 text-sm">
                  <span className="block text-xs text-muted-foreground">Dias com meta</span>
                  <span className="font-semibold">{report?.hitGoalDays ?? 0}</span>
                </p>
                <p className="rounded-xl border border-border/70 bg-background/70 p-2 text-sm">
                  <span className="block text-xs text-muted-foreground">Melhor sequencia</span>
                  <span className="font-semibold">{report?.bestStreakDays ?? 0} dias</span>
                </p>
                <p className="rounded-xl border border-border/70 bg-background/70 p-2 text-sm">
                  <span className="block text-xs text-muted-foreground">Periodo</span>
                  <span className="font-semibold">{report?.totalDays ?? 0} dias</span>
                </p>
              </div>

              <div className="space-y-2">
                {reportItems?.map((item) => (
                  <div key={item.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.date}</span>
                      <span className={item.hitGoal ? "text-primary" : "text-muted-foreground"}>
                        {item.consumedMl} ml
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${item.hitGoal ? "bg-primary" : "bg-primary/40"}`}
                        style={{ width: `${item.width}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {isLogSheetOpen ? (
        <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-[100dvh] w-full max-w-2xl flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <p className="text-sm font-semibold">{editingLog ? "Editar consumo" : "Registrar agua"}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setEditingLog(null)
                  setIsLogSheetOpen(false)
                }}
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Card className="border-border/70">
                <CardContent className="space-y-3 pt-4">
                  <Input
                    type="number"
                    min={1}
                    step={50}
                    value={logAmountMl}
                    onChange={(event) => setLogAmountMl(event.target.value)}
                    placeholder="Quantidade em ml"
                  />
                  <Textarea
                    value={logNotes}
                    onChange={(event) => setLogNotes(event.target.value)}
                    placeholder="Notas (opcional)"
                  />
                  <Button type="button" className="h-11 w-full" disabled={isSubmitting} onClick={() => void submitLogSheet()}>
                    {editingLog ? "Salvar alteracoes" : "Registrar consumo"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
