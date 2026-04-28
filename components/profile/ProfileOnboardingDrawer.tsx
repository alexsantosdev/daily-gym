"use client"

import { useEffect, useMemo, useState } from "react"

import { X } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  completeOnboarding,
  createUserProfile,
  updateUserProfile,
} from "@/services/profileService"
import type {
  ActivityLevel,
  ExperienceLevel,
  ProfileGender,
  ProfileGoal,
  UserProfile,
} from "@/types/profile"

interface ProfileOnboardingDrawerProps {
  open: boolean
  userId: string
  defaultDisplayName: string
  initialProfile?: UserProfile | null
  onOpenChange: (open: boolean) => void
  onCompleted: (profile: UserProfile) => void
}

type OnboardingValues = {
  displayName: string
  gender: ProfileGender
  birthDate: string
  age: number
  weightKg: number
  heightCm: number
  activityLevel: ActivityLevel
  sleepAverageHours?: number
  waterIntakeGoalMl?: number
  mealsPerDayGoal?: number
  goal: ProfileGoal
  experienceLevel: ExperienceLevel
  trainingFrequencyGoal: number
  preferredWorkoutDays: number[]
  availableTimeMinutes: number
  targetWeightKg?: number
  currentObjectiveDescription?: string
  injuriesOrLimitations?: string
  foodRestrictions?: string
  preferredDietStyle?: string
  notes?: string
  aiConsent: boolean
}

const totalSteps = 5

function calculateAge(birthDate: string): number {
  if (!birthDate) {
    return 0
  }

  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) {
    return 0
  }

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return Math.max(0, age)
}

function toInitialValues(profile: UserProfile | null | undefined, defaultDisplayName: string): OnboardingValues {
  return {
    displayName: profile?.displayName || defaultDisplayName,
    gender: profile?.gender ?? "prefer_not_to_say",
    birthDate: profile?.birthDate ?? "",
    age: profile?.age ?? 0,
    weightKg: profile?.weightKg ?? 0,
    heightCm: profile?.heightCm ?? 0,
    activityLevel: profile?.activityLevel ?? "moderate",
    sleepAverageHours: profile?.sleepAverageHours,
    waterIntakeGoalMl: profile?.waterIntakeGoalMl,
    mealsPerDayGoal: profile?.mealsPerDayGoal,
    goal: profile?.goal ?? "health",
    experienceLevel: profile?.experienceLevel ?? "beginner",
    trainingFrequencyGoal: profile?.trainingFrequencyGoal ?? 3,
    preferredWorkoutDays: profile?.preferredWorkoutDays ?? [1, 3, 5],
    availableTimeMinutes: profile?.availableTimeMinutes ?? 45,
    targetWeightKg: profile?.targetWeightKg,
    currentObjectiveDescription: profile?.currentObjectiveDescription,
    injuriesOrLimitations: profile?.injuriesOrLimitations,
    foodRestrictions: profile?.foodRestrictions,
    preferredDietStyle: profile?.preferredDietStyle,
    notes: profile?.notes,
    aiConsent: profile?.aiConsent ?? false,
  }
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function ProfileOnboardingDrawer({
  open,
  userId,
  defaultDisplayName,
  initialProfile,
  onOpenChange,
  onCompleted,
}: ProfileOnboardingDrawerProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<OnboardingValues>(() =>
    toInitialValues(initialProfile, defaultDisplayName)
  )

  useEffect(() => {
    setValues(toInitialValues(initialProfile, defaultDisplayName))
  }, [defaultDisplayName, initialProfile])

  useEffect(() => {
    if (values.birthDate) {
      const nextAge = calculateAge(values.birthDate)
      if (nextAge > 0 && nextAge !== values.age) {
        setValues((prev) => ({ ...prev, age: nextAge }))
      }
    }
  }, [values.birthDate, values.age])

  const stepTitle = useMemo(() => {
    if (step === 1) {
      return "Dados basicos"
    }

    if (step === 2) {
      return "Corpo e rotina"
    }

    if (step === 3) {
      return "Objetivo"
    }

    if (step === 4) {
      return "Restricoes e preferencias"
    }

    return "Consentimento IA"
  }, [step])

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return Boolean(values.displayName.trim()) && Boolean(values.birthDate)
    }

    if (step === 2) {
      return values.weightKg > 0 && values.heightCm > 0 && values.availableTimeMinutes > 0
    }

    if (step === 3) {
      return values.trainingFrequencyGoal > 0 && values.preferredWorkoutDays.length > 0
    }

    return true
  }, [step, values])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-hidden border-border/70">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Badge variant="secondary" className="w-fit">
                Passo {step}/{totalSteps}
              </Badge>
              <CardTitle>{stepTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete seu perfil para personalizar treinos, relatorios e Personal IA.
              </p>
            </div>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="max-h-[calc(90vh-12rem)] overflow-y-auto py-4">
          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="onboarding-display-name">Nome</Label>
                <Input
                  id="onboarding-display-name"
                  value={values.displayName}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                  placeholder="Como voce prefere ser chamado"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-gender">Genero</Label>
                  <Select
                    id="onboarding-gender"
                    value={values.gender}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, gender: event.target.value as ProfileGender }))
                    }
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                    <option value="prefer_not_to_say">Prefiro nao informar</option>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-birth-date">Data de nascimento</Label>
                  <Input
                    id="onboarding-birth-date"
                    type="date"
                    value={values.birthDate}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, birthDate: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-weight">Peso atual (kg)</Label>
                  <Input
                    id="onboarding-weight"
                    type="number"
                    min={0}
                    step="0.1"
                    value={values.weightKg || ""}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, weightKg: Number(event.target.value) }))
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-height">Altura (cm)</Label>
                  <Input
                    id="onboarding-height"
                    type="number"
                    min={0}
                    value={values.heightCm || ""}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, heightCm: Number(event.target.value) }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-activity-level">Nivel de atividade</Label>
                  <Select
                    id="onboarding-activity-level"
                    value={values.activityLevel}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, activityLevel: event.target.value as ActivityLevel }))
                    }
                  >
                    <option value="sedentary">Sedentario</option>
                    <option value="light">Leve</option>
                    <option value="moderate">Moderado</option>
                    <option value="active">Ativo</option>
                    <option value="very_active">Muito ativo</option>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-time">Tempo disponivel por sessao (min)</Label>
                  <Input
                    id="onboarding-time"
                    type="number"
                    min={10}
                    step={5}
                    value={values.availableTimeMinutes || ""}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, availableTimeMinutes: Number(event.target.value) }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-sleep">Sono medio (h)</Label>
                  <Input
                    id="onboarding-sleep"
                    type="number"
                    min={0}
                    max={24}
                    step="0.5"
                    value={values.sleepAverageHours ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        sleepAverageHours: parseOptionalNumber(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-water">Meta de agua (ml)</Label>
                  <Input
                    id="onboarding-water"
                    type="number"
                    min={0}
                    step={100}
                    value={values.waterIntakeGoalMl ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        waterIntakeGoalMl: parseOptionalNumber(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-meals-goal">Refeicoes por dia</Label>
                  <Input
                    id="onboarding-meals-goal"
                    type="number"
                    min={1}
                    value={values.mealsPerDayGoal ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        mealsPerDayGoal: parseOptionalNumber(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-goal">Objetivo principal</Label>
                  <Select
                    id="onboarding-goal"
                    value={values.goal}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, goal: event.target.value as ProfileGoal }))
                    }
                  >
                    <option value="hypertrophy">Hipertrofia</option>
                    <option value="fat_loss">Emagrecimento</option>
                    <option value="strength">Forca</option>
                    <option value="maintenance">Manutencao</option>
                    <option value="conditioning">Condicionamento</option>
                    <option value="health">Saude</option>
                    <option value="other">Outro</option>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-exp">Nivel de experiencia</Label>
                  <Select
                    id="onboarding-exp"
                    value={values.experienceLevel}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        experienceLevel: event.target.value as ExperienceLevel,
                      }))
                    }
                  >
                    <option value="beginner">Iniciante</option>
                    <option value="intermediate">Intermediario</option>
                    <option value="advanced">Avancado</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-frequency">Meta semanal de treinos</Label>
                  <Input
                    id="onboarding-frequency"
                    type="number"
                    min={1}
                    max={7}
                    value={values.trainingFrequencyGoal || ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        trainingFrequencyGoal: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-target-weight">Peso alvo (kg)</Label>
                  <Input
                    id="onboarding-target-weight"
                    type="number"
                    min={0}
                    step="0.1"
                    value={values.targetWeightKg ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        targetWeightKg: parseOptionalNumber(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Dias preferidos para treinar</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: 0, label: "Dom" },
                    { value: 1, label: "Seg" },
                    { value: 2, label: "Ter" },
                    { value: 3, label: "Qua" },
                    { value: 4, label: "Qui" },
                    { value: 5, label: "Sex" },
                    { value: 6, label: "Sab" },
                  ].map((day) => {
                    const isActive = values.preferredWorkoutDays.includes(day.value)
                    return (
                      <Button
                        key={day.value}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        className="h-10"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            preferredWorkoutDays: isActive
                              ? prev.preferredWorkoutDays.filter((item) => item !== day.value)
                              : [...prev.preferredWorkoutDays, day.value].sort((a, b) => a - b),
                          }))
                        }
                      >
                        {day.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="onboarding-objective">Objetivo atual em detalhes</Label>
                <Textarea
                  id="onboarding-objective"
                  value={values.currentObjectiveDescription ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      currentObjectiveDescription: event.target.value,
                    }))
                  }
                  placeholder="Ex: ganhar massa com foco em costas e melhorar condicionamento"
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="onboarding-injuries">Lesoes ou limitacoes</Label>
                <Textarea
                  id="onboarding-injuries"
                  value={values.injuriesOrLimitations ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, injuriesOrLimitations: event.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="onboarding-food-restrictions">Restricoes alimentares</Label>
                <Textarea
                  id="onboarding-food-restrictions"
                  value={values.foodRestrictions ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, foodRestrictions: event.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-diet-style">Estilo alimentar preferido</Label>
                  <Input
                    id="onboarding-diet-style"
                    value={values.preferredDietStyle ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, preferredDietStyle: event.target.value }))
                    }
                    placeholder="Opcional"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-notes">Observacoes</Label>
                  <Input
                    id="onboarding-notes"
                    value={values.notes ?? ""}
                    onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                O Personal IA usa seus dados para sugerir treinos, atividades e orientacoes alimentares
                gerais. Voce pode alterar esse consentimento depois na pagina de perfil.
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={values.aiConsent ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setValues((prev) => ({ ...prev, aiConsent: true }))}
                >
                  Aceito usar IA personalizada
                </Button>
                <Button
                  type="button"
                  variant={!values.aiConsent ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setValues((prev) => ({ ...prev, aiConsent: false }))}
                >
                  Prefiro nao usar agora
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1 || isSubmitting}
          >
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            {step < totalSteps ? (
              <Button
                type="button"
                onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))}
                disabled={!canGoNext || isSubmitting}
              >
                Proximo
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting || !canGoNext}
                onClick={async () => {
                  setError(null)
                  setIsSubmitting(true)
                  try {
                    const basePayload = {
                      displayName: values.displayName.trim(),
                      gender: values.gender,
                      birthDate: values.birthDate,
                      age: values.age,
                      weightKg: values.weightKg,
                      heightCm: values.heightCm,
                      goal: values.goal,
                      experienceLevel: values.experienceLevel,
                      trainingFrequencyGoal: values.trainingFrequencyGoal,
                      preferredWorkoutDays: values.preferredWorkoutDays,
                      availableTimeMinutes: values.availableTimeMinutes,
                      injuriesOrLimitations: values.injuriesOrLimitations || undefined,
                      foodRestrictions: values.foodRestrictions || undefined,
                      preferredDietStyle: values.preferredDietStyle || undefined,
                      currentObjectiveDescription: values.currentObjectiveDescription || undefined,
                      aiConsent: values.aiConsent,
                      activityLevel: values.activityLevel,
                      sleepAverageHours: values.sleepAverageHours,
                      waterIntakeGoalMl: values.waterIntakeGoalMl,
                      mealsPerDayGoal: values.mealsPerDayGoal,
                      targetWeightKg: values.targetWeightKg,
                      notes: values.notes || undefined,
                      onboardingCompleted: true,
                    }

                    if (initialProfile) {
                      await updateUserProfile(userId, basePayload)
                      await completeOnboarding(userId)
                      const mergedProfile: UserProfile = {
                        ...initialProfile,
                        ...basePayload,
                        id: initialProfile.id,
                        userId,
                        createdAt: initialProfile.createdAt,
                        updatedAt: new Date().toISOString(),
                      }
                      onCompleted(mergedProfile)
                    } else {
                      const createdProfile = await createUserProfile({ userId, ...basePayload })
                      onCompleted(createdProfile)
                    }

                    onOpenChange(false)
                  } catch (submitError) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : "Nao foi possivel salvar seu perfil."
                    )
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              >
                {isSubmitting ? "Salvando..." : "Concluir onboarding"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
