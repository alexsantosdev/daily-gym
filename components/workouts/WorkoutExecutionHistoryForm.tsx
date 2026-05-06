"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getWorkoutExecutionStatusLabel } from "@/lib/labels"
import { workoutExecutionStatus, type WorkoutExecution, type WorkoutExecutionStatus } from "@/types/workout"

export interface WorkoutExecutionHistoryFormValues {
  date: string
  status: WorkoutExecutionStatus
  startedAt?: string
  checkinAt?: string
  finishedAt?: string
  checkoutAt?: string
  notes?: string
  photoFile: File | null
}

function toDateTimeLocalValue(value?: string) {
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

interface WorkoutExecutionHistoryFormProps {
  execution: WorkoutExecution
  workoutName: string
  planName: string
  isSubmitting?: boolean
  onSubmit: (values: WorkoutExecutionHistoryFormValues) => Promise<void>
  onCancel: () => void
}

export function WorkoutExecutionHistoryForm({
  execution,
  workoutName,
  planName,
  isSubmitting,
  onSubmit,
  onCancel,
}: WorkoutExecutionHistoryFormProps) {
  const [date, setDate] = useState(execution.date)
  const [status, setStatus] = useState<WorkoutExecutionStatus>(execution.status)
  const [startedAt, setStartedAt] = useState(toDateTimeLocalValue(execution.startedAt))
  const [checkinAt, setCheckinAt] = useState(toDateTimeLocalValue(execution.checkinAt))
  const [finishedAt, setFinishedAt] = useState(toDateTimeLocalValue(execution.finishedAt))
  const [checkoutAt, setCheckoutAt] = useState(toDateTimeLocalValue(execution.checkoutAt))
  const [notes, setNotes] = useState(execution.notes ?? "")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(execution.photoUrl ?? null)

  useEffect(() => {
    setDate(execution.date)
    setStatus(execution.status)
    setStartedAt(toDateTimeLocalValue(execution.startedAt))
    setCheckinAt(toDateTimeLocalValue(execution.checkinAt))
    setFinishedAt(toDateTimeLocalValue(execution.finishedAt))
    setCheckoutAt(toDateTimeLocalValue(execution.checkoutAt))
    setNotes(execution.notes ?? "")
    setPhotoFile(null)
    setPhotoPreviewUrl(execution.photoUrl ?? null)
  }, [execution])

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(execution.photoUrl ?? null)
      return
    }

    const nextUrl = URL.createObjectURL(photoFile)
    setPhotoPreviewUrl(nextUrl)

    return () => {
      URL.revokeObjectURL(nextUrl)
    }
  }, [execution.photoUrl, photoFile])

  const canSubmit = useMemo(() => Boolean(date), [date])

  async function handleSubmit() {
    if (!canSubmit) {
      return
    }

    await onSubmit({
      date,
      status,
      startedAt: startedAt || undefined,
      checkinAt: checkinAt || undefined,
      finishedAt: finishedAt || undefined,
      checkoutAt: checkoutAt || undefined,
      notes: notes.trim() || undefined,
      photoFile,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Editar execucao</p>
        <p className="text-xs text-muted-foreground">
          {planName} - {workoutName}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="history-execution-date">Data</Label>
          <Input id="history-execution-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="history-execution-status">Status</Label>
          <Select
            id="history-execution-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as WorkoutExecutionStatus)}
          >
            {workoutExecutionStatus.map((item) => (
              <option key={item} value={item}>
                {getWorkoutExecutionStatusLabel(item)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="datetime-local" step={1} value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
        <Input type="datetime-local" step={1} value={checkinAt} onChange={(event) => setCheckinAt(event.target.value)} />
        <Input type="datetime-local" step={1} value={finishedAt} onChange={(event) => setFinishedAt(event.target.value)} />
        <Input type="datetime-local" step={1} value={checkoutAt} onChange={(event) => setCheckoutAt(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="history-execution-notes">Observacoes</Label>
        <Textarea
          id="history-execution-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Atualize observacoes do treino"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="history-execution-photo">Foto do treino</Label>
        <Input
          id="history-execution-photo"
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
          <p className="text-xs text-muted-foreground">Sem foto anexada.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? "Salvando..." : "Salvar alteracoes"}
        </Button>
      </div>
    </div>
  )
}
