"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { MonthlyCheckinDrawer } from "@/components/profile/MonthlyCheckinDrawer"
import { ProfileProgressTimeline } from "@/components/profile/ProfileProgressTimeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/useAuth"
import {
  getCurrentMonthCheckin,
  getMonthlyCheckins,
  shouldRequestMonthlyCheckin,
} from "@/services/monthlyCheckinService"
import { getUserProfile, updateUserProfile } from "@/services/profileService"
import type { UserMonthlyCheckin, UserProfile } from "@/types/profile"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [checkins, setCheckins] = useState<UserMonthlyCheckin[]>([])
  const [currentMonthCheckin, setCurrentMonthCheckin] = useState<UserMonthlyCheckin | null>(null)
  const [showMonthlyDrawer, setShowMonthlyDrawer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) {
        if (isMounted) {
          setProfile(null)
          setCheckins([])
          setCurrentMonthCheckin(null)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)

      try {
        const [loadedProfile, loadedCheckins, loadedCurrent, needMonthlyCheckin] = await Promise.all([
          getUserProfile(user.uid),
          getMonthlyCheckins(user.uid),
          getCurrentMonthCheckin(user.uid),
          shouldRequestMonthlyCheckin(user.uid),
        ])

        if (!isMounted) {
          return
        }

        setProfile(loadedProfile)
        setCheckins(loadedCheckins)
        setCurrentMonthCheckin(loadedCurrent)

        if (needMonthlyCheckin) {
          setShowMonthlyDrawer(true)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar perfil.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [user?.uid])

  const profileName = useMemo(
    () => profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Atleta",
    [profile?.displayName, user?.displayName, user?.email]
  )

  const sortedCheckins = useMemo(
    () =>
      [...checkins].sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year
        }

        return a.month - b.month
      }),
    [checkins]
  )

  const weightProgressData = useMemo(
    () =>
      sortedCheckins.map((checkin) => ({
        label: `${String(checkin.month).padStart(2, "0")}/${String(checkin.year).slice(-2)}`,
        peso: checkin.weightKg,
        gordura: checkin.bodyFatPercentage ?? null,
      })),
    [sortedCheckins]
  )

  const monthlyBarsData = useMemo(
    () =>
      sortedCheckins.map((checkin) => ({
        label: `${String(checkin.month).padStart(2, "0")}/${String(checkin.year).slice(-2)}`,
        cintura: checkin.waistCm ?? 0,
        peitoral: checkin.chestCm ?? 0,
        quadril: checkin.hipCm ?? 0,
      })),
    [sortedCheckins]
  )

  const latestCheckin = sortedCheckins[sortedCheckins.length - 1] ?? null

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card className="border-border/70">
        <CardContent className="flex flex-col items-center gap-3 py-6">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt={profileName}
              width={128}
              height={128}
              unoptimized
              className="size-28 rounded-full border border-border/70 object-cover"
            />
          ) : (
            <div className="flex size-28 items-center justify-center rounded-full border border-border/70 bg-muted text-3xl font-semibold text-foreground">
              {getInitials(profileName)}
            </div>
          )}

          <h1 className="text-center text-2xl font-black uppercase tracking-wide text-foreground sm:text-3xl">
            {profileName}
          </h1>

          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant={profile?.aiConsent ? "default" : "secondary"}>
              {profile?.aiConsent ? "IA ATIVA" : "IA DESATIVADA"}
            </Badge>
            <Badge variant="outline">PERFIL</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Painel corporal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Peso</p>
            <p className="mt-1 text-lg font-semibold">{profile?.weightKg ? `${profile.weightKg.toFixed(1)} kg` : "-"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Altura</p>
            <p className="mt-1 text-lg font-semibold">{profile?.heightCm ? `${profile.heightCm} cm` : "-"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Treino/semana</p>
            <p className="mt-1 text-lg font-semibold">{profile?.trainingFrequencyGoal ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Tempo por treino</p>
            <p className="mt-1 text-lg font-semibold">
              {profile?.availableTimeMinutes ? `${profile.availableTimeMinutes} min` : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Evolucao de peso mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {weightProgressData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "var(--border)",
                        background: "var(--card)",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="peso"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados mensais suficientes para o grafico.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Medidas por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyBarsData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBarsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "var(--border)",
                        background: "var(--card)",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Bar dataKey="cintura" fill="var(--chart-2)" radius={6} />
                    <Bar dataKey="peitoral" fill="var(--chart-3)" radius={6} />
                    <Bar dataKey="quadril" fill="var(--chart-4)" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem medidas registradas para o grafico.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Resumo da evolucao corporal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Check-ins</p>
            <p className="mt-1 text-lg font-semibold">{checkins.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Ultimo peso</p>
            <p className="mt-1 text-lg font-semibold">
              {latestCheckin?.weightKg ? `${latestCheckin.weightKg.toFixed(1)} kg` : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Gordura corporal</p>
            <p className="mt-1 text-lg font-semibold">
              {latestCheckin?.bodyFatPercentage ? `${latestCheckin.bodyFatPercentage}%` : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Humor ultimo mes</p>
            <p className="mt-1 text-lg font-semibold uppercase">{latestCheckin?.mood ?? "-"}</p>
          </div>
        </CardContent>
      </Card>

      <ProfileProgressTimeline checkins={checkins} />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Check-in mensal</span>
            <Button type="button" size="sm" onClick={() => setShowMonthlyDrawer(true)}>
              Atualizar mes
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          {currentMonthCheckin ? (
            <>
              <p>
                {profileName}, seu check-in mais recente e {currentMonthCheckin.month}/{currentMonthCheckin.year}.
              </p>
              <p>Peso atual no check-in: {currentMonthCheckin.weightKg.toFixed(1)} kg.</p>
            </>
          ) : (
            <p>Voce ainda nao registrou o check-in deste mes.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Dados do perfil</span>
            <Badge variant={profile?.aiConsent ? "default" : "secondary"}>
              {profile?.aiConsent ? "IA ativa" : "IA sem consentimento"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void (async () => {
                  if (!user?.uid) {
                    return
                  }

                  setIsSavingProfile(true)
                  setError(null)

                  try {
                    await updateUserProfile(user.uid, {
                      displayName: profile.displayName,
                      goal: profile.goal,
                      experienceLevel: profile.experienceLevel,
                      weightKg: profile.weightKg,
                      heightCm: profile.heightCm,
                      activityLevel: profile.activityLevel,
                      availableTimeMinutes: profile.availableTimeMinutes,
                      aiConsent: profile.aiConsent,
                      currentObjectiveDescription: profile.currentObjectiveDescription,
                      notes: profile.notes,
                    })
                  } catch (saveError) {
                    setError(
                      saveError instanceof Error
                        ? saveError.message
                        : "Falha ao salvar alteracoes do perfil."
                    )
                  } finally {
                    setIsSavingProfile(false)
                  }
                })()
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-name">Nome</Label>
                  <Input
                    id="profile-name"
                    value={profile.displayName}
                    onChange={(event) =>
                      setProfile((prev) => (prev ? { ...prev, displayName: event.target.value } : prev))
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-goal">Objetivo</Label>
                  <Select
                    id="profile-goal"
                    value={profile.goal}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? {
                              ...prev,
                              goal: event.target.value as UserProfile["goal"],
                            }
                          : prev
                      )
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
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-weight">Peso (kg)</Label>
                  <Input
                    id="profile-weight"
                    type="number"
                    min={0}
                    step="0.1"
                    value={profile.weightKg}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev ? { ...prev, weightKg: Number(event.target.value) } : prev
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-height">Altura (cm)</Label>
                  <Input
                    id="profile-height"
                    type="number"
                    min={0}
                    value={profile.heightCm}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev ? { ...prev, heightCm: Number(event.target.value) } : prev
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-available-time">Tempo por treino (min)</Label>
                  <Input
                    id="profile-available-time"
                    type="number"
                    min={0}
                    value={profile.availableTimeMinutes}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? { ...prev, availableTimeMinutes: Number(event.target.value) }
                          : prev
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-experience">Nivel</Label>
                  <Select
                    id="profile-experience"
                    value={profile.experienceLevel}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? {
                              ...prev,
                              experienceLevel: event.target.value as UserProfile["experienceLevel"],
                            }
                          : prev
                      )
                    }
                  >
                    <option value="beginner">Iniciante</option>
                    <option value="intermediate">Intermediario</option>
                    <option value="advanced">Avancado</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-activity-level">Nivel de atividade</Label>
                  <Select
                    id="profile-activity-level"
                    value={profile.activityLevel}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? {
                              ...prev,
                              activityLevel: event.target.value as UserProfile["activityLevel"],
                            }
                          : prev
                      )
                    }
                  >
                    <option value="sedentary">Sedentario</option>
                    <option value="light">Leve</option>
                    <option value="moderate">Moderado</option>
                    <option value="active">Ativo</option>
                    <option value="very_active">Muito ativo</option>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-objective">Descricao do objetivo</Label>
                <Textarea
                  id="profile-objective"
                  value={profile.currentObjectiveDescription ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, currentObjectiveDescription: event.target.value } : prev
                    )
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-notes">Observacoes</Label>
                <Textarea
                  id="profile-notes"
                  value={profile.notes ?? ""}
                  onChange={(event) =>
                    setProfile((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={profile.aiConsent ? "default" : "outline"}
                  onClick={() =>
                    setProfile((prev) => (prev ? { ...prev, aiConsent: !prev.aiConsent } : prev))
                  }
                >
                  {profile.aiConsent ? "Revogar consentimento IA" : "Ativar consentimento IA"}
                </Button>

                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? "Salvando..." : "Salvar perfil"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Perfil ainda nao encontrado. Complete o onboarding inicial.
            </p>
          )}
        </CardContent>
      </Card>

      {user?.uid ? (
        <MonthlyCheckinDrawer
          open={showMonthlyDrawer}
          userId={user.uid}
          initial={currentMonthCheckin}
          defaultWeightKg={profile?.weightKg}
          onOpenChange={setShowMonthlyDrawer}
          onSaved={(checkin) => {
            setCurrentMonthCheckin(checkin)
            setCheckins((prev) => {
              const withoutSameMonth = prev.filter(
                (item) => !(item.month === checkin.month && item.year === checkin.year)
              )

              return [checkin, ...withoutSameMonth].sort((a, b) => {
                if (a.year !== b.year) {
                  return b.year - a.year
                }

                return b.month - a.month
              })
            })
          }}
        />
      ) : null}
    </div>
  )
}
