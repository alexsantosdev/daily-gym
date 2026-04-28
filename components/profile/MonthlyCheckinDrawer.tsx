"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createMonthlyCheckin,
  uploadMonthlyProgressPhoto,
} from "@/services/monthlyCheckinService"
import type {
  MonthlyCheckinMood,
  UserMonthlyCheckin,
} from "@/types/profile"

interface MonthlyCheckinDrawerProps {
  open: boolean
  userId: string
  initial?: UserMonthlyCheckin | null
  defaultWeightKg?: number
  onOpenChange: (open: boolean) => void
  onSaved: (checkin: UserMonthlyCheckin) => void
}

interface MonthlyCheckinFormValues {
  month: number
  year: number
  weightKg: number
  waistCm?: number
  chestCm?: number
  hipCm?: number
  armCm?: number
  thighCm?: number
  bodyFatPercentage?: number
  mood?: MonthlyCheckinMood
  energyLevel?: 1 | 2 | 3 | 4 | 5
  sleepQuality?: 1 | 2 | 3 | 4 | 5
  adherenceNote: string
  objectiveUpdate: string
  photoFile: File | null
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getDefaults(initial?: UserMonthlyCheckin | null, defaultWeightKg = 0): MonthlyCheckinFormValues {
  const now = new Date()

  return {
    month: initial?.month ?? now.getMonth() + 1,
    year: initial?.year ?? now.getFullYear(),
    weightKg: initial?.weightKg ?? defaultWeightKg,
    waistCm: initial?.waistCm,
    chestCm: initial?.chestCm,
    hipCm: initial?.hipCm,
    armCm: initial?.armCm,
    thighCm: initial?.thighCm,
    bodyFatPercentage: initial?.bodyFatPercentage,
    mood: initial?.mood,
    energyLevel: initial?.energyLevel,
    sleepQuality: initial?.sleepQuality,
    adherenceNote: initial?.adherenceNote ?? "",
    objectiveUpdate: initial?.objectiveUpdate ?? "",
    photoFile: null,
  }
}

export function MonthlyCheckinDrawer({
  open,
  userId,
  initial,
  defaultWeightKg,
  onOpenChange,
  onSaved,
}: MonthlyCheckinDrawerProps) {
  const [values, setValues] = useState<MonthlyCheckinFormValues>(() =>
    getDefaults(initial, defaultWeightKg)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.progressPhotoUrl ?? null)

  useEffect(() => {
    setValues(getDefaults(initial, defaultWeightKg))
    setPreviewUrl(initial?.progressPhotoUrl ?? null)
  }, [defaultWeightKg, initial])

  useEffect(() => {
    if (!values.photoFile) {
      return
    }

    const objectUrl = URL.createObjectURL(values.photoFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [values.photoFile])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center">
      <Card className="max-h-[90vh] w-full max-w-xl overflow-hidden border-border/70">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Atualizacao mensal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Atualize peso, medidas e energia para melhorar a analise da sua evolucao.
              </p>
            </div>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="max-h-[calc(90vh-10rem)] overflow-y-auto py-4">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void (async () => {
                setError(null)
                setIsSubmitting(true)
                try {
                  let progressPhotoUrl = initial?.progressPhotoUrl

                  if (values.photoFile) {
                    progressPhotoUrl = await uploadMonthlyProgressPhoto(userId, values.photoFile)
                  }

                  const saved = await createMonthlyCheckin({
                    userId,
                    month: values.month,
                    year: values.year,
                    weightKg: values.weightKg,
                    waistCm: values.waistCm,
                    chestCm: values.chestCm,
                    hipCm: values.hipCm,
                    armCm: values.armCm,
                    thighCm: values.thighCm,
                    bodyFatPercentage: values.bodyFatPercentage,
                    progressPhotoUrl,
                    mood: values.mood,
                    energyLevel: values.energyLevel,
                    sleepQuality: values.sleepQuality,
                    adherenceNote: values.adherenceNote || undefined,
                    objectiveUpdate: values.objectiveUpdate || undefined,
                  })

                  onSaved(saved)
                  onOpenChange(false)
                } catch (submitError) {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : "Nao foi possivel salvar o check-in mensal."
                  )
                } finally {
                  setIsSubmitting(false)
                }
              })()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-month">Mes</Label>
                <Input
                  id="monthly-month"
                  type="number"
                  min={1}
                  max={12}
                  value={values.month}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, month: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-year">Ano</Label>
                <Input
                  id="monthly-year"
                  type="number"
                  min={2020}
                  value={values.year}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, year: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-weight">Peso (kg)</Label>
                <Input
                  id="monthly-weight"
                  type="number"
                  min={0}
                  step="0.1"
                  value={values.weightKg || ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, weightKg: Number(event.target.value) }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-waist">Cintura (cm)</Label>
                <Input
                  id="monthly-waist"
                  type="number"
                  min={0}
                  step="0.1"
                  value={values.waistCm ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, waistCm: parseOptionalNumber(event.target.value) }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-chest">Peitoral (cm)</Label>
                <Input
                  id="monthly-chest"
                  type="number"
                  min={0}
                  step="0.1"
                  value={values.chestCm ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, chestCm: parseOptionalNumber(event.target.value) }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-hip">Quadril (cm)</Label>
                <Input
                  id="monthly-hip"
                  type="number"
                  min={0}
                  step="0.1"
                  value={values.hipCm ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, hipCm: parseOptionalNumber(event.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-arm">Braco (cm)</Label>
                <Input
                  id="monthly-arm"
                  type="number"
                  min={0}
                  step="0.1"
                  value={values.armCm ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, armCm: parseOptionalNumber(event.target.value) }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-thigh">Coxa (cm)</Label>
                <Input
                  id="monthly-thigh"
                  type="number"
                  min={0}
                  step="0.1"
                  value={values.thighCm ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, thighCm: parseOptionalNumber(event.target.value) }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-bodyfat">Gordura corporal (%)</Label>
                <Input
                  id="monthly-bodyfat"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={values.bodyFatPercentage ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      bodyFatPercentage: parseOptionalNumber(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-mood">Humor</Label>
                <Select
                  id="monthly-mood"
                  value={values.mood ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      mood: event.target.value ? (event.target.value as MonthlyCheckinMood) : undefined,
                    }))
                  }
                >
                  <option value="">Nao informado</option>
                  <option value="low">Baixo</option>
                  <option value="neutral">Neutro</option>
                  <option value="good">Bom</option>
                  <option value="great">Excelente</option>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-energy">Energia (1 a 5)</Label>
                <Select
                  id="monthly-energy"
                  value={values.energyLevel ? String(values.energyLevel) : ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      energyLevel: event.target.value
                        ? (Number(event.target.value) as 1 | 2 | 3 | 4 | 5)
                        : undefined,
                    }))
                  }
                >
                  <option value="">Nao informado</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="monthly-sleep-quality">Qualidade do sono (1 a 5)</Label>
                <Select
                  id="monthly-sleep-quality"
                  value={values.sleepQuality ? String(values.sleepQuality) : ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      sleepQuality: event.target.value
                        ? (Number(event.target.value) as 1 | 2 | 3 | 4 | 5)
                        : undefined,
                    }))
                  }
                >
                  <option value="">Nao informado</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="monthly-photo">Foto de progresso</Label>
              <Input
                id="monthly-photo"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, photoFile: event.target.files?.[0] ?? null }))
                }
              />

              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Foto de progresso"
                  width={1200}
                  height={640}
                  unoptimized
                  className="h-44 w-full rounded-xl object-cover"
                />
              ) : (
                <p className="text-xs text-muted-foreground">Sem foto selecionada.</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="monthly-adherence">Aderencia no mes</Label>
              <Textarea
                id="monthly-adherence"
                value={values.adherenceNote}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, adherenceNote: event.target.value }))
                }
                placeholder="Como foi sua constancia no mes"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="monthly-objective-update">Atualizacao de objetivo</Label>
              <Textarea
                id="monthly-objective-update"
                value={values.objectiveUpdate}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, objectiveUpdate: event.target.value }))
                }
                placeholder="Mudou alguma prioridade para o proximo mes?"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Agora nao
              </Button>
              <Button type="submit" disabled={isSubmitting || values.weightKg <= 0}>
                {isSubmitting ? "Salvando..." : "Salvar atualizacao"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
