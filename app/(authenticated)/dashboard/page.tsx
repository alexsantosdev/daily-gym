"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Flame } from "@phosphor-icons/react"

import { MetricCard } from "@/components/dashboard/MetricCard"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { TodaySummary } from "@/components/dashboard/TodaySummary"
import { GroupChallengeBanner } from "@/components/groups/GroupChallengeBanner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StreakCalendar } from "@/components/streaks/StreakCalendar"
import { StreakCard } from "@/components/streaks/StreakCard"
import { Skeleton } from "@/components/ui/skeleton"
import { calculateGroupScore } from "@/lib/groupScore"
import { getDateRangeFromPreset, getLastNDates, getTodayWeekday, toIsoDate, todayIsoDate } from "@/lib/date"
import { useActivities } from "@/hooks/useActivities"
import { useAuth } from "@/hooks/useAuth"
import { useMeals } from "@/hooks/useMeals"
import { useWorkouts } from "@/hooks/useWorkouts"
import { getGroupActivities } from "@/services/groupActivityService"
import { getGroupMembers, getUserGroups } from "@/services/groupService"
import { getPlanningEventsByUser } from "@/services/planningService"
import { generateReportBundle } from "@/services/reportService"
import { getCalendarStreakStatuses, getStreakSummary } from "@/services/streakService"
import { cn } from "@/lib/utils"
import type { GroupChallengeBannerData } from "@/types/group"
import type { PlanningEvent } from "@/types/planning"
import type { GeneratedReport, ReportFilters } from "@/types/report"

export default function DashboardPage() {
  const { user } = useAuth()
  const { activities, isLoading: activitiesLoading } = useActivities(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })
  const { meals, isLoading: mealsLoading } = useMeals(user?.uid)
  const { plans, workouts, executions, isLoading: workoutsLoading } = useWorkouts(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })

  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(true)
  const [upcomingPlanning, setUpcomingPlanning] = useState<PlanningEvent[]>([])
  const [isLoadingPlanning, setIsLoadingPlanning] = useState(true)
  const [challengeBanner, setChallengeBanner] = useState<GroupChallengeBannerData | null>(null)
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true)

  const today = todayIsoDate()

  useEffect(() => {
    if (!user?.uid) {
      setReport(null)
      setIsLoadingReport(false)
      return
    }

    const range = getDateRangeFromPreset("7d")
    const filters: ReportFilters = {
      userId: user.uid,
      periodPreset: "7d",
      periodStart: range.periodStart,
      periodEnd: range.periodEnd,
      type: "general",
    }

    setIsLoadingReport(true)

    void generateReportBundle(filters, meals, activities, executions, workouts, plans)
      .then(setReport)
      .finally(() => setIsLoadingReport(false))
  }, [user?.uid, meals, activities, executions, workouts, plans])

  useEffect(() => {
    let isMounted = true

    async function loadUpcomingPlanning() {
      if (!user?.uid) {
        if (isMounted) {
          setUpcomingPlanning([])
          setIsLoadingPlanning(false)
        }
        return
      }

      setIsLoadingPlanning(true)

      try {
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        const events = await getPlanningEventsByUser(user.uid, {
          start: todayIsoDate(),
          end: toIsoDate(endDate),
        })

        if (!isMounted) {
          return
        }

        setUpcomingPlanning(
          events
            .filter((event) => event.status === "planned")
            .sort((a, b) => {
              const dateCompare = a.date.localeCompare(b.date)
              if (dateCompare !== 0) {
                return dateCompare
              }
              return a.startTime.localeCompare(b.startTime)
            })
            .slice(0, 3)
        )
      } catch (error) {
        console.warn("Nao foi possivel carregar os proximos planejamentos.", error)
        if (isMounted) {
          setUpcomingPlanning([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlanning(false)
        }
      }
    }

    void loadUpcomingPlanning()

    return () => {
      isMounted = false
    }
  }, [user?.uid])

  useEffect(() => {
    let isMounted = true

    async function loadChallengeBanner() {
      if (!user?.uid) {
        if (isMounted) {
          setChallengeBanner(null)
          setIsLoadingChallenge(false)
        }
        return
      }

      setIsLoadingChallenge(true)

      try {
        const groups = (await getUserGroups(user.uid)).filter((group) => group.status === "active")

        if (groups.length === 0) {
          if (isMounted) {
            setChallengeBanner({
              mode: "cta",
            })
            setIsLoadingChallenge(false)
          }
          return
        }

        const weekRange = getDateRangeFromPreset("7d")

        const groupSnapshots = await Promise.all(
          groups.map(async (group) => {
            const [members, activities] = await Promise.all([
              getGroupMembers(group.id),
              getGroupActivities(group.id, {
                start: weekRange.periodStart,
                end: weekRange.periodEnd,
              }),
            ])

            const ranking = calculateGroupScore(activities, members)
            const currentUserRow = ranking.find((row) => row.memberId === user.uid)

            return {
              group,
              activitiesCount: activities.length,
              activities,
              ranking,
              currentUserRow,
            }
          })
        )

        const validSnapshots = groupSnapshots.filter((snapshot) => Boolean(snapshot.currentUserRow))

        if (validSnapshots.length === 0) {
          if (isMounted) {
            setChallengeBanner({
              mode: "cta",
            })
            setIsLoadingChallenge(false)
          }
          return
        }

        validSnapshots.sort((a, b) => {
          if (b.activitiesCount !== a.activitiesCount) {
            return b.activitiesCount - a.activitiesCount
          }

          return b.group.updatedAt.localeCompare(a.group.updatedAt)
        })

        const selected = validSnapshots[0]
        const ranking = selected.ranking
        const userRow = selected.currentUserRow
        const leader = ranking[0]
        const getLatestPhotoByUser = (userId: string) =>
          selected.activities.find(
            (activity) =>
              activity.userId === userId &&
              (activity.type === "workout_photo" || activity.type === "activity_photo") &&
              Boolean(activity.photoUrl)
          )?.photoUrl

        if (!userRow || !leader) {
          if (isMounted) {
            setChallengeBanner({
              mode: "starting",
              groupId: selected.group.id,
              groupName: selected.group.name,
            })
            setIsLoadingChallenge(false)
          }
          return
        }

        const allWithoutPoints = ranking.every((row) => row.totalPoints === 0)
        const tieRival = ranking.find(
          (row) => row.memberId !== user.uid && row.totalPoints === userRow.totalPoints
        )
        const rivalAbove = userRow.rank > 1 ? ranking[userRow.rank - 2] : undefined
        const secondPlace = ranking[1]

        const baseData: GroupChallengeBannerData = {
          mode: "starting",
          groupId: selected.group.id,
          groupName: selected.group.name,
          userRank: userRow.rank,
          userPoints: userRow.totalPoints,
          leaderName: leader.name,
          leaderPoints: leader.totalPoints,
        }

        if (allWithoutPoints) {
          if (isMounted) {
            setChallengeBanner(baseData)
          }
        } else if (tieRival) {
          if (isMounted) {
            setChallengeBanner({
              ...baseData,
              mode: "tied",
              rivalName: tieRival.name,
              rivalPhotoURL: getLatestPhotoByUser(tieRival.memberId) ?? tieRival.photoURL,
              rivalPoints: tieRival.totalPoints,
              pointsDiff: 0,
            })
          }
        } else if (userRow.rank === 1) {
          const gapToSecond = secondPlace ? Math.max(0, userRow.totalPoints - secondPlace.totalPoints) : 0
          if (isMounted) {
            setChallengeBanner({
              ...baseData,
              mode: "leading",
              rivalName: secondPlace?.name,
              rivalPhotoURL:
                (secondPlace ? getLatestPhotoByUser(secondPlace.memberId) : undefined) ??
                secondPlace?.photoURL,
              rivalPoints: secondPlace?.totalPoints,
              pointsDiff: gapToSecond,
            })
          }
        } else {
          const pointsDiff = Math.max(
            0,
            (rivalAbove?.totalPoints ?? leader.totalPoints) - userRow.totalPoints
          )
          if (isMounted) {
            setChallengeBanner({
              ...baseData,
              mode: "trailing",
              rivalName: rivalAbove?.name ?? leader.name,
              rivalPhotoURL:
                (rivalAbove ? getLatestPhotoByUser(rivalAbove.memberId) : undefined) ??
                getLatestPhotoByUser(leader.memberId) ??
                rivalAbove?.photoURL ??
                leader.photoURL,
              rivalPoints: rivalAbove?.totalPoints ?? leader.totalPoints,
              pointsDiff,
            })
          }
        }
      } catch (error) {
        console.warn("Nao foi possivel carregar o banner de competicao no dashboard.", error)
        if (isMounted) {
          setChallengeBanner(null)
        }
      } finally {
        if (isMounted) {
          setIsLoadingChallenge(false)
        }
      }
    }

    void loadChallengeBanner()

    return () => {
      isMounted = false
    }
  }, [user?.uid])

  const todayMeals = useMemo(() => meals.filter((meal) => meal.date === today), [meals, today])

  const activePlan = useMemo(() => plans.find((plan) => plan.status === "active") ?? null, [plans])
  const todayWorkout = useMemo(() => {
    if (!activePlan) {
      return null
    }

    const weekday = getTodayWeekday()

    return (
      workouts.find((workout) => workout.planId === activePlan.id && workout.weekday === weekday) ??
      workouts.find((workout) => workout.planId === activePlan.id) ??
      null
    )
  }, [activePlan, workouts])

  const todayExecution = useMemo(
    () =>
      executions.find(
        (execution) =>
          execution.date === today &&
          (execution.status === "executed" || execution.status === "partial")
      ) ?? null,
    [executions, today]
  )

  const lastExecuted = useMemo(
    () => executions.find((execution) => execution.status === "executed") ?? null,
    [executions]
  )

  const loading = mealsLoading || workoutsLoading || activitiesLoading || isLoadingReport
  const streakSummary = useMemo(
    () => getStreakSummary(plans, workouts, executions, activities, today),
    [activities, executions, plans, today, workouts]
  )
  const streakCalendar = useMemo(
    () => getCalendarStreakStatuses(getLastNDates(14), plans, workouts, executions, activities),
    [activities, executions, plans, workouts]
  )
  const userName = user?.displayName?.trim() || user?.email?.split("@")[0] || "atleta"
  const hasWorkoutToday = executions.some(
    (execution) =>
      execution.date === today &&
      (execution.status === "executed" || execution.status === "partial" || execution.status === "in_progress")
  )
  const hasRegisteredActivityToday = activities.some((activity) => activity.date === today)
  const hasActiveDayToday = hasWorkoutToday || hasRegisteredActivityToday
  const streakBadgeActive = hasActiveDayToday

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge
          className={cn(
            "w-fit rounded-full px-3 py-1 text-xs",
            streakBadgeActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
          variant="secondary"
        >
          <Flame className="mr-1.5 size-3.5" weight={streakBadgeActive ? "fill" : "regular"} />
          {streakSummary.currentStreak} ofensiva{streakSummary.currentStreak === 1 ? "" : "s"}
        </Badge>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ola, {userName}</h1>
          <p className="text-sm text-muted-foreground">
            Aqui esta seu resumo diario.
            {hasActiveDayToday ? " Voce ja se manteve ativo hoje." : " Vamos ativar o dia com um treino ou atividade."}
          </p>
        </div>
      </section>

      {isLoadingChallenge ? (
        <Skeleton className="h-40 w-full" />
      ) : challengeBanner ? (
        <GroupChallengeBanner data={challengeBanner} />
      ) : null}

      <section className="space-y-3">
        <StreakCard
          summary={streakSummary}
          userName={userName}
          isActiveToday={hasActiveDayToday}
        />
        <StreakCalendar statuses={streakCalendar} isActiveToday={hasActiveDayToday} />
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Treinos executados"
            value={report?.workoutStats.workoutsExecuted ?? 0}
            subtitle="Ultimos 7 dias"
            progress={report?.workoutStats.executionRate ?? 0}
          />
          <MetricCard
            title="Planejados x executados"
            value={`${report?.workoutStats.workoutsExecuted ?? 0}/${report?.workoutStats.workoutsPlanned ?? 0}`}
            subtitle="Meta semanal"
            progress={report?.workoutStats.executionRate ?? 0}
          />
          <MetricCard
            title="Refeicoes hoje"
            value={todayMeals.length}
            subtitle="No dia atual"
            progress={Math.min(100, todayMeals.length * 25)}
          />
          <MetricCard
            title="Consistencia"
            value={`${report?.generalStats.consistencyScore ?? 0}%`}
            subtitle="Ultimos 7 dias"
            progress={report?.generalStats.consistencyScore ?? 0}
          />
        </section>
      )}

      <TodaySummary
        todayWorkout={todayWorkout}
        mealsToday={todayMeals}
        lastExecution={lastExecuted}
        todayExecution={todayExecution}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Proximos planejamentos</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/planning">Abrir planejamento</Link>
          </Button>
        </div>
        <div className="space-y-2">
          {isLoadingPlanning ? (
            <>
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </>
          ) : upcomingPlanning.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
              Sem eventos planejados. Abra Planejamento para organizar sua semana.
            </p>
          ) : (
            upcomingPlanning.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.date} • {event.startTime} • {event.type === "meal" ? "Refeicao" : event.type === "workout" ? "Treino" : "Atividade"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Atalhos rapidos</h2>
        <QuickActions />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Frequencia semanal</h2>
        <div className="h-56 rounded-2xl border border-border/60 bg-card/70 p-2">
          {report ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.workoutCharts.workoutsByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
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
                <Line type="monotone" dataKey="executed" stroke="var(--chart-1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full" />
          )}
        </div>
      </section>
    </div>
  )
}
