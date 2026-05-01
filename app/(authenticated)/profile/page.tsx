"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { SignOut, XCircle } from "@phosphor-icons/react"
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

import { StravaIcon } from "@/components/icons/StravaIcon"
import { MonthlyCheckinDrawer } from "@/components/profile/MonthlyCheckinDrawer"
import { ProfileProgressTimeline } from "@/components/profile/ProfileProgressTimeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useActivities } from "@/hooks/useActivities"
import { useAuth } from "@/hooks/useAuth"
import {
  buildStravaActivityNotes,
  getStravaActivityDate,
  getStravaSportType,
  toActivityTypeFromStrava,
} from "@/lib/stravaActivity"
import {
  deleteStravaConnection,
  getStravaConnection,
  upsertStravaConnection,
} from "@/services/stravaConnectionService"
import {
  buildStravaAuthorizeUrl,
  createStravaWebhookSubscription,
  createStravaOAuthState,
  exchangeStravaCode,
  getResolvedStravaClientId,
  importStravaRuns,
  listStravaWebhookSubscriptions,
  parseAcceptedScopes,
} from "@/services/stravaIntegrationService"
import {
  getCurrentMonthCheckin,
  getMonthlyCheckins,
} from "@/services/monthlyCheckinService"
import { getUserProfile, updateUserProfile } from "@/services/profileService"
import type { UserMonthlyCheckin, UserProfile } from "@/types/profile"
import type { StravaConnection } from "@/types/strava"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getStravaAthleteName(connection: Pick<StravaConnection, "athleteName">) {
  return connection.athleteName || "Atleta Strava"
}

function toDateInputFromIso(dateIso?: string) {
  if (!dateIso) {
    return new Date().toISOString().slice(0, 10)
  }

  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function sortCheckinsByUpdatedAtAsc(a: UserMonthlyCheckin, b: UserMonthlyCheckin) {
  return a.updatedAt.localeCompare(b.updatedAt)
}

function sortCheckinsByUpdatedAtDesc(a: UserMonthlyCheckin, b: UserMonthlyCheckin) {
  return b.updatedAt.localeCompare(a.updatedAt)
}

function appendAndSortCheckins(checkins: UserMonthlyCheckin[], nextCheckin: UserMonthlyCheckin) {
  return [...checkins, nextCheckin].sort(sortCheckinsByUpdatedAtAsc)
}

function formatCheckinPointLabel(checkin: UserMonthlyCheckin, index: number) {
  const date = new Date(checkin.updatedAt)
  if (Number.isNaN(date.getTime())) {
    return `P${index + 1}`
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatWeightDelta(delta?: number | null) {
  if (typeof delta !== "number") {
    return "-"
  }

  if (delta === 0) {
    return "0.0 kg"
  }

  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const userId = user?.uid
  const { createImportedStravaActivities } = useActivities(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [checkins, setCheckins] = useState<UserMonthlyCheckin[]>([])
  const [currentMonthCheckin, setCurrentMonthCheckin] = useState<UserMonthlyCheckin | null>(null)
  const [showMonthlyDrawer, setShowMonthlyDrawer] = useState(false)
  const [showStravaDialog, setShowStravaDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isConnectingStrava, setIsConnectingStrava] = useState(false)
  const [isImportingStrava, setIsImportingStrava] = useState(false)
  const [isDisconnectingStrava, setIsDisconnectingStrava] = useState(false)
  const [isActivatingStravaWebhook, setIsActivatingStravaWebhook] = useState(false)
  const [stravaConnection, setStravaConnection] = useState<StravaConnection | null>(null)
  const [importStartDate, setImportStartDate] = useState(() => {
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() - 30)
    return defaultDate.toISOString().slice(0, 10)
  })
  const [stravaImportProgress, setStravaImportProgress] = useState(0)
  const [stravaImportStep, setStravaImportStep] = useState<string | null>(null)
  const [stravaImportMessage, setStravaImportMessage] = useState<string | null>(null)
  const [stravaWebhookStatusMessage, setStravaWebhookStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastHandledOAuthCodeRef = useRef<string | null>(null)

  const persistStravaIntegrationStatus = useCallback(
    async (nextConnection: StravaConnection | null) => {
      if (!userId) {
        return
      }

      const status = nextConnection
        ? {
            connected: true,
            athleteId: nextConnection.athleteId,
            athleteName: nextConnection.athleteName,
            scope: nextConnection.scope,
            connectedAt: nextConnection.connectedAt,
            lastSyncAt: nextConnection.lastSyncAt,
          }
        : {
            connected: false,
          }

      await updateUserProfile(userId, {
        stravaIntegration: status,
      })

      setProfile((prev) => (prev ? { ...prev, stravaIntegration: status } : prev))
    },
    [userId]
  )

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
        const [loadedProfile, loadedCheckins, loadedCurrent, loadedStravaConnection] = await Promise.all([
          getUserProfile(user.uid),
          getMonthlyCheckins(user.uid),
          getCurrentMonthCheckin(user.uid),
          getStravaConnection(user.uid),
        ])

        if (!isMounted) {
          return
        }

        setProfile(loadedProfile)
        setCheckins(loadedCheckins)
        setCurrentMonthCheckin(loadedCurrent)
        setStravaConnection(loadedStravaConnection)
        setImportStartDate(toDateInputFromIso(loadedStravaConnection?.lastSyncAt))
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

  useEffect(() => {
    const code = searchParams.get("code")
    const errorCode = searchParams.get("error")
    const state = searchParams.get("state")
    const scope = searchParams.get("scope")

    if (!code && !errorCode) {
      return
    }

    if (code && lastHandledOAuthCodeRef.current === code) {
      return
    }

    if (!user?.uid) {
      return
    }

    const callbackUrl = new URL(window.location.href)
    callbackUrl.searchParams.delete("code")
    callbackUrl.searchParams.delete("scope")
    callbackUrl.searchParams.delete("state")
    callbackUrl.searchParams.delete("error")
    const cleanPath = `${callbackUrl.pathname}${callbackUrl.search ? callbackUrl.search : ""}`

    if (errorCode) {
      setError(`Autorizacao no Strava negada: ${errorCode}.`)
      router.replace(cleanPath)
      return
    }

    const pendingState = window.localStorage.getItem("strava_oauth_state")
    if (!state || !pendingState || state !== pendingState || !state.startsWith(`${user.uid}.`)) {
      setError("Estado OAuth do Strava invalido. Tente conectar novamente.")
      router.replace(cleanPath)
      return
    }

    setIsConnectingStrava(true)
    setError(null)
    setStravaImportMessage(null)
    if (code) {
      lastHandledOAuthCodeRef.current = code
    } else {
      return
    }

    void (async () => {
      try {
        const response = await exchangeStravaCode({ code })
        const token = response.token
        const acceptedScopes = parseAcceptedScopes(scope ?? token.scope)
        if (!acceptedScopes.includes("activity:read") && !acceptedScopes.includes("activity:read_all")) {
          throw new Error("Conexao Strava sem escopo de leitura de atividades. Autorize activity:read.")
        }
        const athleteName =
          `${token.athlete?.firstname ?? ""} ${token.athlete?.lastname ?? ""}`.trim() ||
          "Atleta Strava"
        const nextConnection: StravaConnection = {
          userId: user.uid,
          athleteId: token.athlete?.id ?? 0,
          athleteName,
          scope: acceptedScopes,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: token.expires_at,
          connectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSyncAt: undefined,
        }

        if (!nextConnection.athleteId) {
          throw new Error("Resposta de autenticacao do Strava sem atleta valido.")
        }

        await upsertStravaConnection(nextConnection)
        await persistStravaIntegrationStatus(nextConnection)
        setStravaConnection(nextConnection)
        setStravaImportMessage("Conta Strava conectada com sucesso.")
      } catch (connectError) {
        setError(
          connectError instanceof Error
            ? connectError.message
            : "Falha ao finalizar conexao com Strava."
        )
      } finally {
        window.localStorage.removeItem("strava_oauth_state")
        setIsConnectingStrava(false)
        router.replace(cleanPath)
      }
    })()
  }, [persistStravaIntegrationStatus, router, searchParams, user?.uid])

  useEffect(() => {
    if (!showStravaDialog || !stravaConnection) {
      return
    }

    void (async () => {
      try {
        const subscriptions = await listStravaWebhookSubscriptions()
        if (subscriptions.length > 0) {
          setStravaWebhookStatusMessage("Sincronizacao automatica ativa via webhook.")
        } else {
          setStravaWebhookStatusMessage("Webhook ainda nao ativo para sincronizacao automatica.")
        }
      } catch (webhookError) {
        setStravaWebhookStatusMessage(
          webhookError instanceof Error
            ? `Webhook: ${webhookError.message}`
            : "Nao foi possivel verificar status do webhook."
        )
      }
    })()
  }, [showStravaDialog, stravaConnection])

  async function connectWithStrava() {
    if (!user?.uid) {
      return
    }

    setError(null)
    setIsConnectingStrava(true)
    try {
      const stravaClientId = await getResolvedStravaClientId()
      if (!stravaClientId) {
        setError("STRAVA_CLIENT_ID nao configurado no ambiente.")
        setIsConnectingStrava(false)
        return
      }

      const state = createStravaOAuthState(user.uid)
      window.localStorage.setItem("strava_oauth_state", state)
      const redirectUri = `${window.location.origin}/profile`
    const authUrl = buildStravaAuthorizeUrl({
      clientId: stravaClientId,
      redirectUri,
      state,
      scope: ["activity:read", "activity:read_all"],
    })
      window.location.assign(authUrl)
    } catch {
      setError("Nao foi possivel iniciar a conexao com Strava.")
      setIsConnectingStrava(false)
    }
  }

  async function importRunsFromStrava() {
    if (!user?.uid || !stravaConnection) {
      return
    }

    setIsImportingStrava(true)
    setStravaImportProgress(5)
    setStravaImportStep("Preparando sincronizacao...")
    setError(null)
    setStravaImportMessage(null)

    try {
      const afterDate = new Date(`${importStartDate}T00:00:00`)
      const afterEpoch = Number.isNaN(afterDate.getTime())
        ? undefined
        : Math.floor(afterDate.getTime() / 1000)
      setStravaImportProgress(20)
      setStravaImportStep("Buscando atividades no Strava...")

      const response = await importStravaRuns({
        connection: {
          accessToken: stravaConnection.accessToken,
          refreshToken: stravaConnection.refreshToken,
          expiresAt: stravaConnection.expiresAt,
        },
        afterEpoch,
        perPage: 100,
      })
      setStravaImportProgress(45)
      setStravaImportStep("Processando atividades importadas...")

      const mappedActivities = response.activities.map((activity) => {
        const durationMinutes = Math.max(1, Math.round((activity.moving_time ?? 0) / 60))
        const isWalk = getStravaSportType(activity).includes("walk")

        return {
          name: activity.name || (isWalk ? "Caminhada Strava" : "Corrida Strava"),
          type: toActivityTypeFromStrava(activity),
          date: getStravaActivityDate(activity),
          durationMinutes,
          notes: buildStravaActivityNotes(activity),
          source: "strava" as const,
          externalSourceId: String(activity.id),
          sourceMetadata: {
            sportType: activity.sport_type ?? activity.type,
            distanceMeters: activity.distance,
            movingTimeSeconds: activity.moving_time,
            elapsedTimeSeconds: activity.elapsed_time,
            elevationGainMeters: activity.total_elevation_gain,
            averageSpeedMps: activity.average_speed,
            averageHeartrateBpm: activity.average_heartrate,
            calories: activity.calories,
            startedAt: activity.start_date_local ?? activity.start_date,
          },
        }
      })
      setStravaImportProgress(55)
      setStravaImportStep("Registrando atividades no Daily Gym...")

      const importResult = await createImportedStravaActivities(mappedActivities, {
        onProgress: ({ processed, total }) => {
          const progressRatio = total > 0 ? processed / total : 1
          const computed = 55 + Math.round(progressRatio * 30)
          setStravaImportProgress(Math.min(85, computed))
          setStravaImportStep(`Importando ${processed}/${total} atividades...`)
        },
      })

      const refreshedConnection: StravaConnection = {
        ...stravaConnection,
        accessToken: response.token.accessToken,
        refreshToken: response.token.refreshToken,
        expiresAt: response.token.expiresAt,
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await upsertStravaConnection(refreshedConnection)
      await persistStravaIntegrationStatus(refreshedConnection)
      setStravaConnection(refreshedConnection)
      setImportStartDate(toDateInputFromIso(refreshedConnection.lastSyncAt))
      setStravaImportProgress(100)
      setStravaImportStep("Importacao concluida.")

      setStravaImportMessage(
        importResult.created === 0 && (response.debug?.totalFetched ?? 0) > 0
          ? `Nenhuma atividade nova para importar. Atividades lidas do Strava: ${response.debug?.totalFetched ?? 0}. Elegiveis para importacao: ${response.debug?.importableMatched ?? 0}.`
          : `Importacao concluida. Novas atividades: ${importResult.created}. Ignoradas (duplicadas): ${importResult.skipped}.`
      )
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Falha ao importar corridas/caminhadas do Strava."
      )
      setStravaImportStep("Falha na importacao.")
    } finally {
      setIsImportingStrava(false)
      setTimeout(() => {
        setStravaImportProgress(0)
        setStravaImportStep(null)
      }, 1800)
    }
  }

  async function disconnectStrava() {
    if (!user?.uid) {
      return
    }

    setIsDisconnectingStrava(true)
    setError(null)
    setStravaImportMessage(null)

    try {
      await deleteStravaConnection(user.uid)
      await persistStravaIntegrationStatus(null)
      setStravaConnection(null)
      setStravaWebhookStatusMessage(null)
      setImportStartDate(new Date().toISOString().slice(0, 10))
      setShowStravaDialog(false)
      setStravaImportMessage("Conexao com Strava removida.")
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Falha ao desconectar Strava."
      )
    } finally {
      setIsDisconnectingStrava(false)
    }
  }

  async function activateStravaWebhook() {
    setIsActivatingStravaWebhook(true)
    setError(null)

    try {
      const created = await createStravaWebhookSubscription()
      setStravaWebhookStatusMessage(
        created.reused
          ? `Webhook ja estava ativo (subscription #${created.subscriptionId}).`
          : `Webhook ativo (subscription #${created.subscriptionId}).`
      )
      setStravaImportMessage("Sincronizacao automatica habilitada. Novas atividades serao sincronizadas via webhook.")
    } catch (webhookError) {
      setError(
        webhookError instanceof Error
          ? webhookError.message
          : "Falha ao ativar webhook do Strava."
      )
    } finally {
      setIsActivatingStravaWebhook(false)
    }
  }

  const profileName = useMemo(
    () => profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Atleta",
    [profile?.displayName, user?.displayName, user?.email]
  )

  const sortedCheckins = useMemo(
    () => [...checkins].sort(sortCheckinsByUpdatedAtAsc),
    [checkins]
  )
  const timelineCheckins = useMemo(
    () => [...checkins].sort(sortCheckinsByUpdatedAtDesc),
    [checkins]
  )

  const weightProgressData = useMemo(
    () =>
      sortedCheckins.map((checkin, index) => ({
        label: formatCheckinPointLabel(checkin, index),
        peso: checkin.weightKg,
        gordura: checkin.bodyFatPercentage ?? null,
      })),
    [sortedCheckins]
  )

  const monthlyBarsData = useMemo(
    () =>
      sortedCheckins.map((checkin, index) => ({
        label: formatCheckinPointLabel(checkin, index),
        cintura: checkin.waistCm,
        peitoral: checkin.chestCm,
        quadril: checkin.hipCm,
      })),
    [sortedCheckins]
  )

  const latestCheckin = sortedCheckins[sortedCheckins.length - 1] ?? null
  const previousCheckin = sortedCheckins[sortedCheckins.length - 2] ?? null
  const latestWeight = latestCheckin?.weightKg ?? profile?.weightKg ?? null
  const latestWeightDelta =
    latestCheckin && previousCheckin
      ? Number((latestCheckin.weightKg - previousCheckin.weightKg).toFixed(1))
      : null
  const hasMeasuresData = monthlyBarsData.some(
    (item) =>
      typeof item.cintura === "number" ||
      typeof item.peitoral === "number" ||
      typeof item.quadril === "number"
  )

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

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-border/70 bg-gradient-to-br from-muted/35 via-card to-muted/10">
          <CardHeader className="gap-1">
            <CardTitle>Visao corporal</CardTitle>
            <CardDescription>
              {latestCheckin
                ? `Ultima referencia: ${String(latestCheckin.month).padStart(2, "0")}/${latestCheckin.year}`
                : "Sem check-ins suficientes para comparativos."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Peso atual</p>
              <p className="mt-1 text-lg font-semibold">
                {typeof latestWeight === "number" ? `${latestWeight.toFixed(1)} kg` : "-"}
              </p>
            </article>
            <article className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Variacao mensal</p>
              <p className="mt-1 text-lg font-semibold">{formatWeightDelta(latestWeightDelta)}</p>
            </article>
            <article className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Check-ins</p>
              <p className="mt-1 text-lg font-semibold">{sortedCheckins.length}</p>
            </article>
            <article className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Humor</p>
              <p className="mt-1 text-lg font-semibold uppercase">{latestCheckin?.mood ?? "-"}</p>
            </article>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="gap-1">
            <CardTitle>Check-in mensal</CardTitle>
            <CardDescription>Atualize medidas para refletir no painel e nos graficos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            {currentMonthCheckin ? (
              <>
                <p>
                  Registro atual: {String(currentMonthCheckin.month).padStart(2, "0")}/{currentMonthCheckin.year}
                </p>
                <p>Peso no mes: {currentMonthCheckin.weightKg.toFixed(1)} kg</p>
              </>
            ) : (
              <p>Voce ainda nao registrou o check-in deste mes.</p>
            )}
            <Button type="button" onClick={() => setShowMonthlyDrawer(true)}>
              Atualizar check-in
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70">
        <CardHeader className="gap-1">
          <CardTitle>Evolucao corporal</CardTitle>
          <CardDescription>Graficos alimentados pelos check-ins mensais.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weight" className="flex flex-col gap-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weight">Peso</TabsTrigger>
              <TabsTrigger value="measures">Medidas</TabsTrigger>
            </TabsList>

            <TabsContent value="weight">
              {weightProgressData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightProgressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: "var(--border)",
                          background: "var(--card)",
                          color: "var(--card-foreground)",
                        }}
                      />
                      <Line type="monotone" dataKey="peso" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="gordura" stroke="var(--chart-5)" strokeWidth={1.6} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados mensais suficientes para o grafico.</p>
              )}
            </TabsContent>

            <TabsContent value="measures">
              {hasMeasuresData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBarsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ProfileProgressTimeline checkins={timelineCheckins} />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Integracoes</span>
            <Badge variant={stravaConnection ? "default" : "outline"}>
              {stravaConnection ? "Strava conectado" : "Strava desconectado"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <StravaIcon className="size-4 text-[#FC4C02]" />
                Strava
              </p>
              <p className="text-xs text-muted-foreground">
                {stravaConnection
                  ? `Conectado como ${getStravaAthleteName(stravaConnection)}.`
                  : "Conecte sua conta para importar corridas e caminhadas automaticamente para Atividades."}
              </p>
              {stravaConnection?.lastSyncAt ? (
                <p className="text-xs text-muted-foreground">
                  Ultima sincronizacao: {new Date(stravaConnection.lastSyncAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <Button type="button" variant="outline" onClick={() => setShowStravaDialog(true)}>
              <StravaIcon className="mr-1 size-4 text-[#FC4C02]" />
              {stravaConnection ? "Gerenciar importacao" : "Conectar Strava"}
            </Button>
          </div>
          {stravaImportMessage ? <p className="text-sm text-muted-foreground">{stravaImportMessage}</p> : null}
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

      {showStravaDialog ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-background/75 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-lg py-6">
            <Card className="border-border/70">
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 text-base font-semibold">
                      <StravaIcon className="size-4 text-[#FC4C02]" />
                      Integracao com Strava
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Importe corridas e caminhadas do Strava e registre automaticamente no Daily Gym.
                    </p>
                  </div>
                  <Button type="button" size="icon-sm" variant="outline" onClick={() => setShowStravaDialog(false)}>
                    <XCircle className="size-4" />
                  </Button>
                </div>

                <div className="rounded-xl border border-border/70 p-3 text-sm">
                  <p className="font-medium">O que sera importado para Atividades</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>- Nome da atividade (corrida/caminhada)</li>
                    <li>- Data da atividade</li>
                    <li>- Duracao (minutos)</li>
                    <li>- Distancia, elevacao e ritmo medio</li>
                    <li>- Frequencia cardiaca media (quando disponivel)</li>
                    <li>- Calorias (quando disponivel)</li>
                  </ul>
                </div>

                {!stravaConnection ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Requer escopo <code>activity:read</code> para leitura das atividades.
                    </p>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => void connectWithStrava()}
                      disabled={isConnectingStrava}
                    >
                      <StravaIcon className="mr-1 size-4 text-[#FC4C02]" />
                      {isConnectingStrava ? "Conectando..." : "Conectar com Strava"}
                    </Button>
                    {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/70 p-3 text-xs text-muted-foreground">
                      <p>
                        Conta conectada: <span className="font-medium text-foreground">{getStravaAthleteName(stravaConnection)}</span>
                      </p>
                      <p>Athlete ID: {stravaConnection.athleteId}</p>
                      <p>Escopos: {stravaConnection.scope.join(", ") || "-"}</p>
                    </div>

                    <div className="rounded-xl border border-border/70 p-3 text-xs">
                      <p className="font-medium">Sincronizacao automatica</p>
                      <p className="mt-1 text-muted-foreground">
                        {stravaWebhookStatusMessage ?? "Verificando status do webhook..."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => void activateStravaWebhook()}
                        disabled={isActivatingStravaWebhook}
                      >
                        {isActivatingStravaWebhook ? "Ativando..." : "Ativar sincronizacao automatica"}
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="strava-import-start">Importar corridas/caminhadas a partir de</Label>
                      <Input
                        id="strava-import-start"
                        type="date"
                        value={importStartDate}
                        onChange={(event) => setImportStartDate(event.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button type="button" onClick={() => void importRunsFromStrava()} disabled={isImportingStrava}>
                        <StravaIcon className="mr-1 size-4 text-[#FC4C02]" />
                        {isImportingStrava ? "Importando..." : "Importar corridas/caminhadas"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void disconnectStrava()}
                        disabled={isDisconnectingStrava}
                      >
                        <SignOut className="mr-1 size-4" />
                        {isDisconnectingStrava ? "Desconectando..." : "Desconectar"}
                      </Button>
                    </div>

                    {stravaImportStep || isImportingStrava ? (
                      <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">{stravaImportStep ?? "Sincronizando..."}</p>
                          <span className="text-[11px] text-muted-foreground">{stravaImportProgress}%</span>
                        </div>
                        <Progress value={stravaImportProgress} />
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {user?.uid ? (
        <MonthlyCheckinDrawer
          open={showMonthlyDrawer}
          userId={user.uid}
          initial={currentMonthCheckin}
          defaultWeightKg={profile?.weightKg}
          onOpenChange={setShowMonthlyDrawer}
          onSaved={(checkin) => {
            const now = new Date()
            const isCurrentMonth =
              checkin.month === now.getMonth() + 1 && checkin.year === now.getFullYear()

            if (isCurrentMonth) {
              setCurrentMonthCheckin(checkin)
            }

            setCheckins((prev) => {
              const next = appendAndSortCheckins(prev, checkin)
              return next
            })

            setProfile((prev) => (prev ? { ...prev, weightKg: checkin.weightKg } : prev))
          }}
        />
      ) : null}
    </div>
  )
}
