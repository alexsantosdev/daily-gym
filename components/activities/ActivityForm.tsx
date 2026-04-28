"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Activity, ActivityType } from "@/types/activity"
import { activityTypes } from "@/types/activity"

const activityTypeLabels: Record<ActivityType, string> = {
  walk: "Caminhada",
  dance: "Danca/Zumba",
  cardio: "Cardio/Corrida",
  custom: "Personalizada",
}

export interface ActivityFormValues {
  name: string
  type: ActivityType
  date: string
  durationMinutes?: number
  notes: string
  photoFile: File | null
}

const defaults: ActivityFormValues = {
  name: "",
  type: "walk",
  date: new Date().toISOString().slice(0, 10),
  durationMinutes: undefined,
  notes: "",
  photoFile: null,
}

function toValues(activity: Activity): ActivityFormValues {
  return {
    name: activity.name,
    type: activity.type,
    date: activity.date,
    durationMinutes: activity.durationMinutes,
    notes: activity.notes ?? "",
    photoFile: null,
  }
}

export function ActivityForm({
  initialActivity,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  initialActivity?: Activity
  isSubmitting?: boolean
  onSubmit: (values: ActivityFormValues) => Promise<void>
  onCancel?: () => void
}) {
  const [values, setValues] = useState<ActivityFormValues>(
    initialActivity ? toValues(initialActivity) : defaults
  )
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialActivity?.photoUrl ?? null)

  useEffect(() => {
    setValues(initialActivity ? toValues(initialActivity) : defaults)
    setPreviewUrl(initialActivity?.photoUrl ?? null)
  }, [initialActivity])

  useEffect(() => {
    if (!values.photoFile) {
      return
    }

    const objectUrl = URL.createObjectURL(values.photoFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [values.photoFile])

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return "Salvando..."
    }

    return initialActivity ? "Atualizar atividade" : "Registrar atividade"
  }, [initialActivity, isSubmitting])

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(values)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="activity-name">Nome da atividade</Label>
        <Input
          id="activity-name"
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Ex: Caminhada no parque"
          required
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="activity-type">Tipo</Label>
          <Select
            id="activity-type"
            value={values.type}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, type: event.target.value as ActivityType }))
            }
          >
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {activityTypeLabels[type]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-date">Data</Label>
          <Input
            id="activity-date"
            type="date"
            value={values.date}
            onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-duration">Duracao (minutos)</Label>
        <Input
          id="activity-duration"
          type="number"
          min={0}
          inputMode="numeric"
          value={values.durationMinutes ?? ""}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              durationMinutes: event.target.value ? Number(event.target.value) : undefined,
            }))
          }
          placeholder="Opcional"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-photo">Foto (opcional)</Label>
        <Input
          id="activity-photo"
          type="file"
          accept="image/*"
          onChange={(event) =>
            setValues((prev) => ({ ...prev, photoFile: event.target.files?.[0] ?? null }))
          }
        />
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Preview da atividade"
            width={1200}
            height={420}
            unoptimized
            className="h-40 w-full rounded-lg object-cover"
          />
        ) : (
          <p className="text-xs text-muted-foreground">Sem foto selecionada.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-notes">Observacoes</Label>
        <Textarea
          id="activity-notes"
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Opcional"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting} className="h-11">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} className="h-11">
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
