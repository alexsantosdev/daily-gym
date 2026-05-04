"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { todayIsoDate } from "@/lib/date"
import type { WaterGoal } from "@/types/water"

interface UseWaterReminderOptions {
  userId?: string
  goal: WaterGoal | null
  onRegister300Ml: () => Promise<void> | void
}

interface WaterReminderState {
  visible: boolean
  message: string
  dismiss: () => void
  register300Ml: () => Promise<void>
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0
  }

  return hours * 60 + minutes
}

function getNowMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function isWithinWindow(nowMinutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes
  }

  return nowMinutes >= startMinutes || nowMinutes <= endMinutes
}

function buildReminderStorageKey(userId: string) {
  return `daily-gym:water-reminder:last:${userId}:${todayIsoDate()}`
}

export function useWaterReminder({
  userId,
  goal,
  onRegister300Ml,
}: UseWaterReminderOptions): WaterReminderState {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("Hora de beber agua.")

  const reminderKey = useMemo(() => (userId ? buildReminderStorageKey(userId) : null), [userId])

  const dismiss = useCallback(() => {
    if (reminderKey) {
      localStorage.setItem(reminderKey, String(Date.now()))
    }
    setVisible(false)
  }, [reminderKey])

  const register300Ml = useCallback(async () => {
    await onRegister300Ml()
    dismiss()
  }, [dismiss, onRegister300Ml])

  useEffect(() => {
    if (!goal?.reminderEnabled || !goal.reminderIntervalMinutes || !userId || !reminderKey) {
      setVisible(false)
      return
    }

    const runCheck = () => {
      const nowMinutes = getNowMinutes()
      const startMinutes = parseTimeToMinutes(goal.startReminderTime)
      const endMinutes = parseTimeToMinutes(goal.endReminderTime)

      if (!isWithinWindow(nowMinutes, startMinutes, endMinutes)) {
        setVisible(false)
        return
      }

      const now = Date.now()
      const lastShown = Number(localStorage.getItem(reminderKey) ?? "0")
      const elapsedMinutes = (now - lastShown) / 60000

      if (elapsedMinutes >= goal.reminderIntervalMinutes) {
        setMessage("Hora de hidratar. Registre um copo para manter o ritmo.")
        setVisible(true)
      }
    }

    runCheck()
    const timer = window.setInterval(runCheck, 30000)
    return () => window.clearInterval(timer)
  }, [
    goal?.endReminderTime,
    goal?.reminderEnabled,
    goal?.reminderIntervalMinutes,
    goal?.startReminderTime,
    reminderKey,
    userId,
  ])

  return {
    visible,
    message,
    dismiss,
    register300Ml,
  }
}

// Future architecture:
// When PWA/Web Push is enabled, this hook can delegate scheduling to a service worker.
