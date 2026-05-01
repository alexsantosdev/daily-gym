"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  CheckCircle,
  ClockCountdown,
  PlayCircle,
  SlidersHorizontal,
  StopCircle,
  XCircle,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { WorkoutReceipt } from "@/components/workouts/WorkoutReceipt"
import { useAuth } from "@/hooks/useAuth"
import { todayIsoDate } from "@/lib/date"
import { getWorkoutExecutionStatusLabel } from "@/lib/labels"
import { extractRepsNumber } from "@/lib/reps"
import { isCardioExercise, isCardioWorkout } from "@/lib/workoutMode"
import { uploadWorkoutExecutionPhoto } from "@/services/workoutExecutionService"
import { cn } from "@/lib/utils"
import type {
  CreateWorkoutExecutionInput,
  ExecutedExercise,
  Workout,
  WorkoutExecutionStatus,
  WorkoutPlan,
} from "@/types/workout"

interface WorkoutExecutionFormProps {
  plans: WorkoutPlan[]
  workouts: Workout[]
  initialPlanId?: string
  initialWorkoutId?: string
  immersive?: boolean
  isSubmitting?: boolean
  hasExecutionToday?: boolean
  onSubmit: (payload: Omit<CreateWorkoutExecutionInput, "userId">) => Promise<void>
  onExecutionCompleted?: () => void
}

interface FinishedWorkoutSummary {
  workoutName: string
  planName: string
  status: WorkoutExecutionStatus
  startedAt?: string
  finishedAt?: string
  durationMinutes: number
  completedCount: number
  totalExercises: number
  exercises: Array<{
    name: string
    isCardio?: boolean
    plannedSets: number
    plannedReps: string
    setsCompleted: number
    repsCompleted: number
    loadUsed?: string
    cardioSummary?: string
    startedAt?: string
    finishedAt?: string
    durationMinutes: number
    completed: boolean
  }>
}

function nowLocalDateTime() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 19)
}

function createExecutedExercises(workout: Workout): ExecutedExercise[] {
  return workout.exercises.map((exercise) => {
    const cardioExercise = isCardioExercise(exercise, workout.muscleGroup)

    return {
      exerciseName: exercise.name,
      setsCompleted: Number.isFinite(exercise.sets) ? exercise.sets : 0,
      repsCompleted: extractRepsNumber(exercise.reps, 0),
      loadUsed: cardioExercise ? "" : exercise.suggestedLoad,
      notes: cardioExercise ? exercise.suggestedLoad ?? "" : "",
      exerciseStartedAt: undefined,
      exerciseFinishedAt: undefined,
      completed: false,
    }
  })
}

function parseDateTime(value?: string): number {
  if (!value) {
    return Number.NaN
  }

  return new Date(value).getTime()
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return "00:00"
  }

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}

function formatClock(value?: string): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}

function toLocalDateTimeInputValue(value?: string): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 19)
}

function buildCardioSummary(exercise: ExecutedExercise): string {
  const blocks = exercise.setsCompleted > 0 ? `${exercise.setsCompleted} blocos` : null
  const duration = exercise.repsCompleted > 0 ? `${exercise.repsCompleted} min` : null
  const distanceValue = exercise.loadUsed?.trim()
  const distance = distanceValue
    ? /\bkm\b/i.test(distanceValue)
      ? distanceValue
      : `${distanceValue} km`
    : null
  return [blocks, duration, distance].filter(Boolean).join(" | ") || "-"
}

export function WorkoutExecutionForm({
  plans,
  workouts,
  initialPlanId,
  initialWorkoutId,
  immersive = false,
  isSubmitting,
  hasExecutionToday,
  onSubmit,
  onExecutionCompleted,
}: WorkoutExecutionFormProps) {
  const { user } = useAuth()
  const [planId, setPlanId] = useState(initialPlanId ?? plans[0]?.id ?? "")
  const [workoutId, setWorkoutId] = useState(initialWorkoutId ?? "")
  const [date, setDate] = useState(todayIsoDate())
  const [status, setStatus] = useState<WorkoutExecutionStatus>("planned")
  const [checkinType, setCheckinType] = useState<NonNullable<CreateWorkoutExecutionInput["checkinType"]>>("auto")

  const [startedAt, setStartedAt] = useState("")
  const [finishedAt, setFinishedAt] = useState("")
  const [checkinAt, setCheckinAt] = useState("")
  const [checkoutAt, setCheckoutAt] = useState("")
  const [notes, setNotes] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState("")
  const [executedExercises, setExecutedExercises] = useState<ExecutedExercise[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [elapsedNow, setElapsedNow] = useState(0)
  const [showRepeatConfirm, setShowRepeatConfirm] = useState(false)
  const [repeatConfirmed, setRepeatConfirmed] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [summary, setSummary] = useState<FinishedWorkoutSummary | null>(null)
  const [showReceipt, setShowReceipt] = useState(true)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const appliedInitialWorkoutIdRef = useRef<string | null>(null)

  const planWorkouts = useMemo(
    () => workouts.filter((workout) => workout.planId === planId),
    [workouts, planId]
  )

  const selectedWorkout = useMemo(
    () => planWorkouts.find((workout) => workout.id === workoutId),
    [planWorkouts, workoutId]
  )

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === planId), [plans, planId])
  const selectedWorkoutIsCardio = useMemo(
    () => isCardioWorkout(selectedWorkout),
    [selectedWorkout]
  )

  const completedCount = executedExercises.filter((exercise) => exercise.completed).length
  const totalExercises = executedExercises.length
  const progressValue = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0

  const isInProgress = status === "in_progress"
  const isFinished = status === "executed" || status === "partial"
  const receiptMode: "planned" | "executed" =
    isInProgress || isFinished || completedCount > 0 ? "executed" : "planned"

  const liveExecutionPreview = useMemo(
    () => ({
      id: "live-preview",
      userId: "",
      planId,
      workoutId,
      date,
      startedAt: startedAt || undefined,
      finishedAt: finishedAt || undefined,
      durationMinutes: undefined,
      status,
      checkinType,
      checkinAt: checkinAt || undefined,
      checkoutAt: checkoutAt || undefined,
      photoUrl: photoUrl || undefined,
      notes: notes || undefined,
      executedExercises,
      createdAt: startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      checkinAt,
      checkinType,
      checkoutAt,
      date,
      executedExercises,
      finishedAt,
      notes,
      photoUrl,
      planId,
      startedAt,
      status,
      workoutId,
    ]
  )

  const elapsedMs = useMemo(() => {
    if (!startedAt || !isInProgress) {
      return 0
    }

    const start = parseDateTime(startedAt)

    if (Number.isNaN(start)) {
      return 0
    }

    return Math.max(0, elapsedNow - start)
  }, [elapsedNow, isInProgress, startedAt])

  useEffect(() => {
    const nextPlanId = initialPlanId ?? plans[0]?.id ?? ""
    setPlanId(nextPlanId)
  }, [initialPlanId, plans])

  useEffect(() => {
    if (initialWorkoutId && appliedInitialWorkoutIdRef.current !== initialWorkoutId) {
      setWorkoutId(initialWorkoutId)
      const initialWorkout = workouts.find((workout) => workout.id === initialWorkoutId)
      if (initialWorkout) {
        setExecutedExercises(createExecutedExercises(initialWorkout))
      }
      appliedInitialWorkoutIdRef.current = initialWorkoutId
      return
    }

    if (initialWorkoutId) {
      return
    }

    if (!planId || workoutId) {
      return
    }

    const firstWorkout = workouts.find((workout) => workout.planId === planId)
    if (!firstWorkout) {
      return
    }

    setWorkoutId(firstWorkout.id)
    setExecutedExercises(createExecutedExercises(firstWorkout))
  }, [initialWorkoutId, planId, workoutId, workouts])

  useEffect(() => {
    if (!isInProgress || !startedAt) {
      return
    }

    const interval = window.setInterval(() => {
      setElapsedNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isInProgress, startedAt])

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(photoUrl || null)
      return
    }

    const nextPreviewUrl = URL.createObjectURL(photoFile)
    setPhotoPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [photoFile, photoUrl])

  async function resolveExecutionPhotoUrl() {
    if (photoFile && user?.uid) {
      setIsUploadingPhoto(true)
      try {
        const uploadedUrl = await uploadWorkoutExecutionPhoto(user.uid, photoFile)
        setPhotoUrl(uploadedUrl)
        return uploadedUrl
      } finally {
        setIsUploadingPhoto(false)
      }
    }

    return photoUrl || undefined
  }

  function updateExercise(index: number, updater: (exercise: ExecutedExercise) => ExecutedExercise) {
    setExecutedExercises((prev) =>
      prev.map((exercise, exerciseIndex) => (exerciseIndex === index ? updater(exercise) : exercise))
    )
  }

  function getLatestFinishedAt(exercises: ExecutedExercise[], skipIndex?: number): string | undefined {
    let latestAt: string | undefined
    let latestMs = Number.NEGATIVE_INFINITY

    exercises.forEach((exercise, exerciseIndex) => {
      if (exerciseIndex === skipIndex || !exercise.exerciseFinishedAt) {
        return
      }

      const finishedMs = parseDateTime(exercise.exerciseFinishedAt)

      if (!Number.isNaN(finishedMs) && finishedMs > latestMs) {
        latestMs = finishedMs
        latestAt = exercise.exerciseFinishedAt
      }
    })

    return latestAt
  }

  function inferExerciseStartAt(index: number, fallbackNow = nowLocalDateTime()) {
    const latestFinishedAt = getLatestFinishedAt(executedExercises, index)
    return latestFinishedAt || startedAt || fallbackNow
  }

  function selectWorkout(nextWorkoutId: string) {
    setWorkoutId(nextWorkoutId)
    const workout = planWorkouts.find((item) => item.id === nextWorkoutId)

    if (workout) {
      setExecutedExercises(createExecutedExercises(workout))
    }
  }

  function startWorkout(forceStart = false) {
    if (!selectedWorkout) {
      return
    }

    if (hasExecutionToday && !repeatConfirmed && !forceStart) {
      setShowRepeatConfirm(true)
      return
    }

    const now = nowLocalDateTime()
    setStartedAt((prev) => prev || now)
    setCheckinAt((prev) => prev || now)
    setStatus("in_progress")
    setShowRepeatConfirm(false)
  }

  function startExercise(index: number) {
    const now = nowLocalDateTime()
    const inferredStartAt = inferExerciseStartAt(index, now)

    updateExercise(index, (exercise) => ({
      ...exercise,
      exerciseStartedAt: exercise.exerciseStartedAt ?? inferredStartAt,
      exerciseFinishedAt: exercise.completed ? undefined : exercise.exerciseFinishedAt,
      completed: false,
    }))
  }

  function toggleExerciseCompleted(index: number) {
    const now = nowLocalDateTime()
    const inferredStartAt = inferExerciseStartAt(index, now)

    updateExercise(index, (exercise) => {
      if (!exercise.completed) {
        return {
          ...exercise,
          completed: true,
          exerciseStartedAt: exercise.exerciseStartedAt ?? inferredStartAt,
          exerciseFinishedAt: now,
        }
      }

      return {
        ...exercise,
        completed: false,
        exerciseFinishedAt: undefined,
      }
    })
  }

  function resetExecutionDraft(nextPlanId?: string, nextWorkoutId?: string) {
    const selectedPlanId = nextPlanId ?? initialPlanId ?? plans[0]?.id ?? ""
    const workoutFromSelection = nextWorkoutId
      ? workouts.find((workout) => workout.id === nextWorkoutId)
      : workouts.find((workout) => workout.planId === selectedPlanId)

    setPlanId(selectedPlanId)
    setWorkoutId(workoutFromSelection?.id ?? "")
    setDate(todayIsoDate())
    setStatus("planned")
    setCheckinType("auto")
    setStartedAt("")
    setFinishedAt("")
    setCheckinAt("")
    setCheckoutAt("")
    setNotes("")
    setPhotoFile(null)
    setPhotoPreviewUrl(null)
    setPhotoUrl("")
    setShowAdvanced(false)
    setElapsedNow(0)
    setRepeatConfirmed(false)
    setShowRepeatConfirm(false)
    setShowReceipt(true)
    setExecutedExercises(workoutFromSelection ? createExecutedExercises(workoutFromSelection) : [])
  }

  async function saveManualExecuted() {
    if (!selectedWorkout) {
      return
    }

    const now = nowLocalDateTime()
    const completedExercises = createExecutedExercises(selectedWorkout).map((exercise, index) => ({
      ...exercise,
      completed: true,
      setsCompleted: selectedWorkout.exercises[index]?.sets ?? 0,
      repsCompleted: extractRepsNumber(selectedWorkout.exercises[index]?.reps, 0),
      exerciseStartedAt: now,
      exerciseFinishedAt: now,
    }))
    const resolvedPhotoUrl = await resolveExecutionPhotoUrl()

    await onSubmit({
      planId,
      workoutId,
      date,
      status: "executed",
      checkinType,
      startedAt: startedAt || now,
      finishedAt: finishedAt || now,
      checkinAt: checkinAt || now,
      checkoutAt: checkoutAt || now,
      photoUrl: resolvedPhotoUrl,
      notes: notes || undefined,
      executedExercises: completedExercises,
    })

    setStatus("executed")
    setStartedAt((prev) => prev || now)
    setFinishedAt((prev) => prev || now)
    setCheckinAt((prev) => prev || now)
    setCheckoutAt((prev) => prev || now)
    setExecutedExercises(completedExercises)
    setSummary({
      workoutName: selectedWorkout.name,
      planName: selectedPlan?.name ?? "Plano",
      status: "executed",
      startedAt: startedAt || now,
      finishedAt: finishedAt || now,
      durationMinutes: 1,
      completedCount: completedExercises.length,
      totalExercises: completedExercises.length,
      exercises: completedExercises.map((exercise, index) => ({
        isCardio: isCardioExercise(selectedWorkout.exercises[index], selectedWorkout.muscleGroup),
        name: exercise.exerciseName,
        plannedSets: selectedWorkout.exercises[index]?.sets ?? 0,
        plannedReps: selectedWorkout.exercises[index]?.reps ?? "0",
        setsCompleted: exercise.setsCompleted,
        repsCompleted: exercise.repsCompleted,
        loadUsed: exercise.loadUsed,
        cardioSummary: buildCardioSummary(exercise),
        startedAt: exercise.exerciseStartedAt,
        finishedAt: exercise.exerciseFinishedAt,
        durationMinutes: 1,
        completed: true,
      })),
    })
    setShowSummaryDialog(true)
    resetExecutionDraft(planId, workoutId)
    onExecutionCompleted?.()
  }

  async function finishWorkout() {
    if (!selectedWorkout) {
      return
    }

    const now = nowLocalDateTime()
    const finalStatus = completedCount === totalExercises && totalExercises > 0 ? "executed" : "partial"
    const resolvedPhotoUrl = await resolveExecutionPhotoUrl()

    const payload: Omit<CreateWorkoutExecutionInput, "userId"> = {
      planId,
      workoutId,
      date,
      startedAt: startedAt || now,
      finishedAt: now,
      status: finalStatus,
      checkinType,
      checkinAt: checkinAt || startedAt || now,
      checkoutAt: now,
      photoUrl: resolvedPhotoUrl,
      notes: notes || undefined,
      executedExercises,
    }

    await onSubmit(payload)

    const startMs = parseDateTime(payload.startedAt)
    const finishMs = parseDateTime(now)
    const totalDurationMinutes = Number.isNaN(startMs) || Number.isNaN(finishMs)
      ? 0
      : Math.max(1, Math.round((finishMs - startMs) / 60000))

    const summaryExercises = executedExercises.map((exercise, index) => {
      const planned = selectedWorkout.exercises[index]
      const exerciseStartMs = parseDateTime(exercise.exerciseStartedAt)
      const exerciseEndMs = parseDateTime(exercise.exerciseFinishedAt)
      const durationMinutes =
        Number.isNaN(exerciseStartMs) || Number.isNaN(exerciseEndMs)
          ? 0
          : Math.max(1, Math.round((exerciseEndMs - exerciseStartMs) / 60000))

      return {
        isCardio: isCardioExercise(planned, selectedWorkout.muscleGroup),
        name: exercise.exerciseName,
        plannedSets: planned?.sets ?? 0,
        plannedReps: planned?.reps ?? "0",
        setsCompleted: exercise.setsCompleted,
        repsCompleted: exercise.repsCompleted,
        loadUsed: exercise.loadUsed,
        cardioSummary: buildCardioSummary(exercise),
        startedAt: exercise.exerciseStartedAt,
        finishedAt: exercise.exerciseFinishedAt,
        durationMinutes,
        completed: exercise.completed,
      }
    })

    setFinishedAt(now)
    setCheckoutAt(now)
    setStatus(finalStatus)
    setSummary({
      workoutName: selectedWorkout.name,
      planName: selectedPlan?.name ?? "Plano",
      status: finalStatus,
      startedAt: payload.startedAt,
      finishedAt: now,
      durationMinutes: totalDurationMinutes,
      completedCount,
      totalExercises,
      exercises: summaryExercises,
    })
    setShowSummaryDialog(true)
    resetExecutionDraft(planId, workoutId)
    onExecutionCompleted?.()
  }

  return (
    <div className={cn("space-y-4", immersive && "pb-28")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="execution-plan">Plano</Label>
          <Select
            id="execution-plan"
            value={planId}
            onChange={(event) => {
              const nextPlanId = event.target.value
              setPlanId(nextPlanId)
              const firstWorkout = workouts.find((workout) => workout.planId === nextPlanId)
              setWorkoutId(firstWorkout?.id ?? "")
              setExecutedExercises(firstWorkout ? createExecutedExercises(firstWorkout) : [])
              setStatus("planned")
              setShowAdvanced(false)
            }}
          >
            <option value="">Selecione</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="execution-workout">Treino</Label>
          <Select id="execution-workout" value={workoutId} onChange={(event) => selectWorkout(event.target.value)}>
            <option value="">Selecione</option>
            {planWorkouts.map((workout) => (
              <option key={workout.id} value={workout.id}>
                {workout.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {selectedWorkout && !immersive ? (
        <div className="space-y-2">
          <Button type="button" variant="outline" onClick={() => setShowReceipt((prev) => !prev)}>
            {showReceipt ? "Ocultar ficha" : "Mostrar ficha"}
          </Button>
          {showReceipt ? (
            <WorkoutReceipt
              mode={receiptMode}
              compact
              plan={selectedPlan}
              workout={selectedWorkout}
              execution={liveExecutionPreview}
            />
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-xl border p-3",
          immersive && "rounded-lg",
          selectedWorkoutIsCardio
            ? "border-cyan-300/70 bg-cyan-50/60"
            : "border-amber-300/70 bg-amber-50/55"
        )}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={selectedWorkoutIsCardio ? "default" : "secondary"} className="text-[10px] uppercase tracking-wide">
            {selectedWorkoutIsCardio ? (
              <>
                <ClockCountdown className="mr-1 size-3" />
                Cardio
              </>
            ) : (
              <>
                <CheckCircle className="mr-1 size-3" />
                Forca
              </>
            )}
          </Badge>
        </div>
        <p className="text-sm font-medium">{getWorkoutExecutionStatusLabel(status)}</p>
        {startedAt ? <p className="mt-1 text-xs text-muted-foreground">Inicio: {formatDateTime(startedAt)}</p> : null}
        {isInProgress ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <ClockCountdown className="size-3.5" />
            Treino em andamento: {formatDurationMs(elapsedMs)}
          </div>
        ) : null}
      </div>

      <div className={cn("grid gap-2", immersive ? "grid-cols-1" : "sm:grid-cols-3")}>
        <div className="space-y-2">
          <Label htmlFor="execution-date">Data</Label>
          <Input id="execution-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="execution-checkin">Check-in</Label>
          <Select
            id="execution-checkin"
            value={checkinType}
            onChange={(event) => setCheckinType(event.target.value as "auto" | "manual")}
          >
            <option value="auto">Automatico</option>
            <option value="manual">Manual</option>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            className="w-full"
            variant={isInProgress ? "secondary" : "default"}
            onClick={() => startWorkout()}
            disabled={!workoutId || isSubmitting || isInProgress}
          >
            <PlayCircle className="mr-2 size-4" />
            {isInProgress ? `Treino em andamento (${formatDurationMs(elapsedMs)})` : "Iniciar treino"}
          </Button>
        </div>
      </div>

      {selectedWorkout ? (
        <div className={cn("space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3", immersive && "border-border/50 bg-transparent p-0")}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Progresso do treino</p>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalExercises} exercicios
            </p>
          </div>
          <Progress value={progressValue} />

          <div className="space-y-2">
            {executedExercises.map((exercise, index) => {
              const plannedExercise = selectedWorkout.exercises[index]
              const cardioExercise = isCardioExercise(plannedExercise, selectedWorkout.muscleGroup)

              return (
                <div
                  key={`${exercise.exerciseName}-${index}`}
                  className={cn(
                    "rounded-xl border border-border/70 bg-card p-3 transition-colors",
                    immersive && "shadow-none",
                    cardioExercise && "border-cyan-300/70 bg-cyan-50/50",
                    !cardioExercise && "border-amber-300/65 bg-amber-50/40",
                    exercise.completed && "border-primary/30 bg-primary/5",
                    exercise.exerciseStartedAt &&
                      !exercise.completed &&
                      "border-accent bg-accent/40"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              exercise.completed && "text-muted-foreground line-through"
                            )}
                          >
                            {exercise.exerciseName}
                          </p>
                          <Badge
                            variant={cardioExercise ? "default" : "secondary"}
                            className="h-5 px-2 text-[10px] uppercase tracking-wide"
                          >
                            {cardioExercise ? "Cardio" : "Forca"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {cardioExercise
                            ? `${plannedExercise?.muscleGroup || "Cardio"}${
                                plannedExercise?.suggestedLoad
                                  ? ` | Ritmo: ${plannedExercise.suggestedLoad}`
                                  : ""
                              }`
                            : `${plannedExercise?.muscleGroup} | ${plannedExercise?.sets ?? 0}x${plannedExercise?.reps ?? 0}${
                                plannedExercise?.suggestedLoad
                                  ? ` | ${plannedExercise.suggestedLoad}`
                                  : ""
                              }`}
                        </p>
                        {cardioExercise && plannedExercise?.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">Plano: {plannedExercise.notes}</p>
                        ) : null}
                      </div>
                      <div className="grid w-full grid-cols-1 gap-1 sm:flex sm:w-auto sm:items-center">
                        <Button
                          type="button"
                          variant={exercise.exerciseStartedAt && !exercise.completed ? "secondary" : "outline"}
                          size="xs"
                          className="w-full sm:w-auto"
                          onClick={() => startExercise(index)}
                          disabled={!isInProgress || exercise.completed}
                        >
                          <PlayCircle className="mr-1 size-3" />
                          {exercise.exerciseStartedAt && !exercise.completed ? "Em andamento" : "Iniciar exercicio"}
                        </Button>
                        <Button
                          type="button"
                          variant={exercise.completed ? "default" : "outline"}
                          size="xs"
                          className="w-full sm:w-auto"
                          onClick={() => toggleExerciseCompleted(index)}
                          disabled={!isInProgress}
                        >
                          <CheckCircle className="mr-1 size-3" />
                          {exercise.completed ? "Concluido" : "Marcar"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                      <span>Inicio: {formatClock(exercise.exerciseStartedAt)}</span>
                      <span className="hidden sm:inline">|</span>
                      <span>Fim: {formatClock(exercise.exerciseFinishedAt)}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-3">
                      <Input
                        type="number"
                        min={0}
                        placeholder={cardioExercise ? "Blocos" : "Series"}
                        value={exercise.setsCompleted}
                        onChange={(event) =>
                          updateExercise(index, (item) => ({
                            ...item,
                            setsCompleted: Number(event.target.value),
                            exerciseStartedAt:
                              item.exerciseStartedAt ?? inferExerciseStartAt(index, nowLocalDateTime()),
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder={cardioExercise ? "Tempo (min)" : "Reps"}
                        value={exercise.repsCompleted}
                        onChange={(event) =>
                          updateExercise(index, (item) => ({
                            ...item,
                            repsCompleted: Number(event.target.value),
                            exerciseStartedAt:
                              item.exerciseStartedAt ?? inferExerciseStartAt(index, nowLocalDateTime()),
                          }))
                        }
                      />
                      <Input
                        type={cardioExercise ? "number" : "text"}
                        min={cardioExercise ? 0 : undefined}
                        step={cardioExercise ? "0.1" : undefined}
                        placeholder={cardioExercise ? "Distancia (km)" : "Carga"}
                        value={exercise.loadUsed ?? ""}
                        onChange={(event) =>
                          updateExercise(index, (item) => ({
                            ...item,
                            loadUsed: event.target.value,
                            exerciseStartedAt:
                              item.exerciseStartedAt ?? inferExerciseStartAt(index, nowLocalDateTime()),
                          }))
                        }
                      />
                    </div>

                    {!immersive ? (
                      <Textarea
                        placeholder={cardioExercise ? "Ritmo/Zona e observacoes opcionais" : "Observacao opcional"}
                        value={exercise.notes ?? ""}
                        onChange={(event) =>
                          updateExercise(index, (item) => ({
                            ...item,
                            notes: event.target.value,
                            exerciseStartedAt:
                              item.exerciseStartedAt ?? inferExerciseStartAt(index, nowLocalDateTime()),
                          }))
                        }
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="workout-notes">Observacoes gerais</Label>
        <Textarea
          id="workout-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Como foi o treino?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workout-photo">Foto do treino (opcional)</Label>
        <Input
          id="workout-photo"
          type="file"
          accept="image/*"
          onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
        />
        {photoPreviewUrl ? (
          <Image
            src={photoPreviewUrl}
            alt="Foto do treino"
            width={1200}
            height={420}
            unoptimized
            className="h-40 w-full rounded-lg object-cover"
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Sem foto anexada. Adicione um comprovante visual do treino, se quiser.
          </p>
        )}
      </div>

      <div
        className={cn(
          "grid gap-2 sm:grid-cols-2",
          immersive &&
            "fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_24px_-16px_rgba(0,0,0,0.35)] sm:grid-cols-2 md:static md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:shadow-none"
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void saveManualExecuted()}
          disabled={!workoutId || isSubmitting || isUploadingPhoto}
          className={cn(immersive && "h-11")}
        >
          <CheckCircle className="mr-2 size-4" />
          {isUploadingPhoto ? "Enviando foto..." : "Marcar como executado"}
        </Button>

        <Button
          type="button"
          className="h-11"
          onClick={() => void finishWorkout()}
          disabled={!workoutId || isSubmitting || !isInProgress || isUploadingPhoto}
        >
          <StopCircle className="mr-2 size-4" />
          {isUploadingPhoto ? "Enviando foto..." : "Finalizar treino"}
        </Button>
      </div>

      {isFinished ? (
        <div className="space-y-2">
          <Button type="button" variant="outline" onClick={() => setShowAdvanced((prev) => !prev)}>
            <SlidersHorizontal className="mr-2 size-4" />
            {showAdvanced ? "Ocultar avancado" : "Mostrar avancado"}
          </Button>

          {showAdvanced ? (
            <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
              <Input
                type="datetime-local"
                step={1}
                value={toLocalDateTimeInputValue(startedAt)}
                onChange={(event) => setStartedAt(event.target.value)}
              />
              <Input
                type="datetime-local"
                step={1}
                value={toLocalDateTimeInputValue(checkinAt)}
                onChange={(event) => setCheckinAt(event.target.value)}
              />
              <Input
                type="datetime-local"
                step={1}
                value={toLocalDateTimeInputValue(finishedAt)}
                onChange={(event) => setFinishedAt(event.target.value)}
              />
              <Input
                type="datetime-local"
                step={1}
                value={toLocalDateTimeInputValue(checkoutAt)}
                onChange={(event) => setCheckoutAt(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {showRepeatConfirm ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <Card className="w-full max-w-md border-border/70">
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm font-semibold">Voce ja treinou hoje</p>
              <p className="text-sm text-muted-foreground">
                Ja existe um treino registrado para hoje. Deseja iniciar um novo treino mesmo assim?
              </p>
              <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                <Button type="button" className="w-full" variant="outline" onClick={() => setShowRepeatConfirm(false)}>
                  <XCircle className="mr-1 size-4" />
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setRepeatConfirmed(true)
                    startWorkout(true)
                  }}
                >
                  <PlayCircle className="mr-1 size-4" />
                  Treinar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showSummaryDialog && summary ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-background/75 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-2xl py-6">
            <Card className="border-border/70">
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">Resumo do treino executado</p>
                    <p className="text-xs text-muted-foreground">{summary.planName} | {summary.workoutName}</p>
                  </div>
                  <Button type="button" size="icon-sm" variant="outline" onClick={() => setShowSummaryDialog(false)}>
                    <XCircle className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-2 rounded-lg border border-border p-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Status: <span className="font-medium text-foreground">{getWorkoutExecutionStatusLabel(summary.status)}</span></p>
                  <p>Duracao total: <span className="font-medium text-foreground">{summary.durationMinutes} min</span></p>
                  <p>Inicio: <span className="font-medium text-foreground">{formatDateTime(summary.startedAt)}</span></p>
                  <p>Fim: <span className="font-medium text-foreground">{formatDateTime(summary.finishedAt)}</span></p>
                  <p className="sm:col-span-2">
                    Exercicios concluidos: <span className="font-medium text-foreground">{summary.completedCount}/{summary.totalExercises}</span>
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  {summary.exercises.map((exercise, index) => (
                    <div key={`${exercise.name}-${index}`} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm font-medium", exercise.completed && "line-through text-muted-foreground")}>{exercise.name}</p>
                        <span className="text-xs text-muted-foreground">{exercise.durationMinutes} min</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {exercise.isCardio
                          ? `Cardio: ${exercise.cardioSummary ?? "-"}`
                          : `Planejado: ${exercise.plannedSets}x${exercise.plannedReps} | Feito: ${exercise.setsCompleted}x${exercise.repsCompleted}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Carga: {exercise.loadUsed || "-"} | Inicio: {formatClock(exercise.startedAt)} | Fim: {formatClock(exercise.finishedAt)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setShowSummaryDialog(false)}>
                    Fechar resumo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
