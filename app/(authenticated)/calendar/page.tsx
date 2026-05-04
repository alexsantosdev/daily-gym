"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { Flame, Plus, X } from "@phosphor-icons/react"

import { DayDetails } from "@/components/calendar/DayDetails"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { TodaySummary } from "@/components/dashboard/TodaySummary"
import { GroupChallengeBanner } from "@/components/groups/GroupChallengeBanner"
import { PageHeader } from "@/components/layout/page-header"
import { PlanningDayDetails } from "@/components/planning/PlanningDayDetails"
import {
  PlanningEventForm,
  type PlanningEventFormValues,
} from "@/components/planning/PlanningEventForm"
import { PlanningEventSheet } from "@/components/planning/PlanningEventSheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StreakCalendar } from "@/components/streaks/StreakCalendar"
import { StreakCard } from "@/components/streaks/StreakCard"
import { useActivities } from "@/hooks/useActivities"
import { useAuth } from "@/hooks/useAuth"
import { useMeals } from "@/hooks/useMeals"
import { useWorkouts } from "@/hooks/useWorkouts"
import { buildCalendarOverviewMetrics } from "@/lib/calendarOverview"
import {
  countPlanningEventsByDate,
  filterPlanningEvents,
  getMonthRange,
  getPlanningEventsByDate,
  getUpcomingPlanningEvents,
  type PlanningTypeFilter,
} from "@/lib/calendarPlanning"
import {
  getDateRangeFromPreset,
  getLastNDates,
  getTodayWeekday,
  parseIsoDateLocal,
  todayIsoDate,
  toIsoDate,
} from "@/lib/date"
import { calculateGroupScore } from "@/lib/groupScore"
import {
  getPlanningEventTypeLabel,
  getPlanningStatusLabel,
  getStreakStatusLabel,
  getWorkoutExecutionStatusLabel,
} from "@/lib/labels"
import { getGroupActivities } from "@/services/groupActivityService"
import { getGroupMembers, getUserGroups } from "@/services/groupService"
import {
  createPlanningEvent,
  deletePlanningEvent,
  getPlanningEventsByUser,
  markPlanningEventCompleted,
  markPlanningEventSkipped,
  updatePlanningEvent,
} from "@/services/planningService"
import { generateReportBundle } from "@/services/reportService"
import {
  getCalendarStreakStatuses,
  getStreakSummary,
} from "@/services/streakService"
import { ensureWaterGoal, getWaterLogsByRange } from "@/services/waterService"
import type { Activity } from "@/types/activity"
import type { GroupChallengeBannerData } from "@/types/group"
import type { Meal } from "@/types/meal"
import type { PlanningEvent } from "@/types/planning"
import type { GeneratedReport, ReportFilters } from "@/types/report"
import type { CalendarStreakStatus } from "@/types/streak"
import type { WorkoutExecution, WorkoutPlan } from "@/types/workout"

interface CalendarDay {
  date: string
  inCurrentMonth: boolean
}

interface DayMarker {
  meals: number
  planned: number
  executed: number
  activities: number
  thumb?: string
  streakStatus?: CalendarStreakStatus["status"]
  competition: boolean
  hydrationGoalHit: boolean
}

const filterOptions: Array<{ value: PlanningTypeFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "meal", label: "Refeicoes" },
  { value: "workout", label: "Treinos" },
  { value: "activity", label: "Atividades" },
]

function buildMonthGrid(monthValue: string): CalendarDay[] {
  const [yearValue, monthPart] = monthValue.split("-")
  const year = Number(yearValue)
  const month = Number(monthPart) - 1

  const firstDay = new Date(year, month, 1)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())

  const days: CalendarDay[] = []

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(start)
    current.setDate(start.getDate() + index)

    days.push({
      date: toIsoDate(current),
      inCurrentMonth: current.getMonth() === month,
    })
  }

  return days
}

function countWorkoutPlansByDate(date: string, plans: WorkoutPlan[]) {
  const weekday = parseIsoDateLocal(date).getDay()

  return plans.filter(
    (plan) => plan.status === "active" && plan.weekdays.includes(weekday)
  ).length
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { activities, isLoading: activitiesLoading } = useActivities(
    user?.uid,
    {
      displayName: user?.displayName,
      email: user?.email,
      photoURL: user?.photoURL,
    }
  )
  const { meals, isLoading: mealsLoading } = useMeals(user?.uid)
  const {
    executions,
    plans,
    workouts,
    isLoading: workoutsLoading,
  } = useWorkouts(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })

  const today = todayIsoDate()
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(today)
  const [planningEvents, setPlanningEvents] = useState<PlanningEvent[]>([])
  const [planningTypeFilter, setPlanningTypeFilter] =
    useState<PlanningTypeFilter>("all")
  const [isPlanningLoading, setIsPlanningLoading] = useState(false)
  const [isPlanningSubmitting, setIsPlanningSubmitting] = useState(false)
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(true)
  const [challengeBanner, setChallengeBanner] =
    useState<GroupChallengeBannerData | null>(null)
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true)
  const [groupActivityDates, setGroupActivityDates] = useState<Set<string>>(
    new Set()
  )
  const [hydrationGoalHitDates, setHydrationGoalHitDates] = useState<
    Set<string>
  >(new Set())
  const [showDaySheet, setShowDaySheet] = useState(false)
  const [isPlanningFormSheetOpen, setIsPlanningFormSheetOpen] = useState(false)
  const [editingPlanningEvent, setEditingPlanningEvent] = useState<
    PlanningEvent | undefined
  >()

  const monthGrid = useMemo(() => buildMonthGrid(month), [month])
  const monthDates = useMemo(
    () => monthGrid.map((day) => day.date),
    [monthGrid]
  )

  const filteredPlanningEvents = useMemo(
    () => filterPlanningEvents(planningEvents, planningTypeFilter),
    [planningEvents, planningTypeFilter]
  )

  const selectedDatePlanningEvents = useMemo(
    () => getPlanningEventsByDate(filteredPlanningEvents, selectedDate, "all"),
    [filteredPlanningEvents, selectedDate]
  )

  const upcomingPlanningEvents = useMemo(
    () => getUpcomingPlanningEvents(filteredPlanningEvents, today),
    [filteredPlanningEvents, today]
  )

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

    void generateReportBundle(
      filters,
      meals,
      activities,
      executions,
      workouts,
      plans
    )
      .then(setReport)
      .finally(() => setIsLoadingReport(false))
  }, [activities, executions, meals, plans, user?.uid, workouts])

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
        const groups = (await getUserGroups(user.uid)).filter(
          (group) => group.status === "active"
        )

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
            const [members, groupActivities] = await Promise.all([
              getGroupMembers(group.id),
              getGroupActivities(group.id, {
                start: weekRange.periodStart,
                end: weekRange.periodEnd,
              }),
            ])

            const ranking = calculateGroupScore(groupActivities, members)
            const currentUserRow = ranking.find(
              (row) => row.memberId === user.uid
            )

            return {
              group,
              activitiesCount: groupActivities.length,
              activities: groupActivities,
              ranking,
              currentUserRow,
            }
          })
        )

        const validSnapshots = groupSnapshots.filter((snapshot) =>
          Boolean(snapshot.currentUserRow)
        )

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
              (activity.type === "workout_photo" ||
                activity.type === "activity_photo") &&
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
          (row) =>
            row.memberId !== user.uid && row.totalPoints === userRow.totalPoints
        )
        const rivalAbove =
          userRow.rank > 1 ? ranking[userRow.rank - 2] : undefined
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
              rivalPhotoURL:
                getLatestPhotoByUser(tieRival.memberId) ?? tieRival.photoURL,
              rivalPoints: tieRival.totalPoints,
              pointsDiff: 0,
            })
          }
        } else if (userRow.rank === 1) {
          const gapToSecond = secondPlace
            ? Math.max(0, userRow.totalPoints - secondPlace.totalPoints)
            : 0
          if (isMounted) {
            setChallengeBanner({
              ...baseData,
              mode: "leading",
              rivalName: secondPlace?.name,
              rivalPhotoURL:
                (secondPlace
                  ? getLatestPhotoByUser(secondPlace.memberId)
                  : undefined) ?? secondPlace?.photoURL,
              rivalPoints: secondPlace?.totalPoints,
              pointsDiff: gapToSecond,
            })
          }
        } else {
          const pointsDiff = Math.max(
            0,
            (rivalAbove?.totalPoints ?? leader.totalPoints) -
              userRow.totalPoints
          )
          if (isMounted) {
            setChallengeBanner({
              ...baseData,
              mode: "trailing",
              rivalName: rivalAbove?.name ?? leader.name,
              rivalPhotoURL:
                (rivalAbove
                  ? getLatestPhotoByUser(rivalAbove.memberId)
                  : undefined) ??
                getLatestPhotoByUser(leader.memberId) ??
                rivalAbove?.photoURL ??
                leader.photoURL,
              rivalPoints: rivalAbove?.totalPoints ?? leader.totalPoints,
              pointsDiff,
            })
          }
        }
      } catch (error) {
        console.warn(
          "Nao foi possivel carregar o banner de competicao no calendario.",
          error
        )
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

  async function loadPlanningEvents(nextMonth = month) {
    if (!user?.uid) {
      setPlanningEvents([])
      return
    }

    setIsPlanningLoading(true)
    try {
      const range = getMonthRange(nextMonth)
      const loadedEvents = await getPlanningEventsByUser(user.uid, range)
      setPlanningEvents(loadedEvents)
    } finally {
      setIsPlanningLoading(false)
    }
  }

  useEffect(() => {
    void loadPlanningEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, month])

  useEffect(() => {
    async function loadGroupCompetitionDates() {
      if (!user?.uid || monthDates.length === 0) {
        setGroupActivityDates(new Set())
        return
      }

      const sortedDates = [...monthDates].sort()
      const start = sortedDates[0]
      const end = sortedDates[sortedDates.length - 1]
      const userGroups = await getUserGroups(user.uid)

      if (userGroups.length === 0) {
        setGroupActivityDates(new Set())
        return
      }

      const activitiesByGroup = await Promise.all(
        userGroups
          .filter((group) => group.status === "active")
          .map((group) => getGroupActivities(group.id, { start, end }))
      )

      const userActivityDates = activitiesByGroup
        .flat()
        .filter((activity) => activity.userId === user.uid)
        .map((activity) => activity.date)

      setGroupActivityDates(new Set(userActivityDates))
    }

    void loadGroupCompetitionDates()
  }, [monthDates, user?.uid])

  useEffect(() => {
    let isMounted = true

    async function loadHydrationGoalDates() {
      if (!user?.uid || monthDates.length === 0) {
        if (isMounted) {
          setHydrationGoalHitDates(new Set())
        }
        return
      }

      const sortedDates = [...monthDates].sort()
      const start = sortedDates[0]
      const end = sortedDates[sortedDates.length - 1]

      try {
        const [goal, logs] = await Promise.all([
          ensureWaterGoal(user.uid),
          getWaterLogsByRange(user.uid, start, end),
        ])

        const consumedByDate = new Map<string, number>()
        logs.forEach((log) => {
          consumedByDate.set(
            log.date,
            (consumedByDate.get(log.date) ?? 0) + log.amountMl
          )
        })

        const completedDates = new Set<string>()
        consumedByDate.forEach((consumedMl, date) => {
          if (consumedMl >= goal.dailyGoalMl) {
            completedDates.add(date)
          }
        })

        if (isMounted) {
          setHydrationGoalHitDates(completedDates)
        }
      } catch (error) {
        console.warn(
          "Nao foi possivel carregar indicadores de hidratacao no calendario.",
          error
        )
        if (isMounted) {
          setHydrationGoalHitDates(new Set())
        }
      }
    }

    void loadHydrationGoalDates()

    return () => {
      isMounted = false
    }
  }, [monthDates, user?.uid])

  const workoutNameById = useMemo(
    () =>
      Object.fromEntries(workouts.map((workout) => [workout.id, workout.name])),
    [workouts]
  )

  const markersByDate = useMemo(() => {
    const markerMap = new Map<string, DayMarker>()
    const streakStatusByDate = new Map(
      getCalendarStreakStatuses(
        monthDates,
        plans,
        workouts,
        executions,
        activities
      ).map((item) => [item.date, item.status])
    )

    monthGrid.forEach((day) => {
      const dayMeals = meals.filter((meal) => meal.date === day.date)
      const dayActivities = activities.filter(
        (activity) => activity.date === day.date
      )
      const dayExecutionWithPhoto = executions.find(
        (execution) =>
          execution.date === day.date && Boolean(execution.photoUrl)
      )
      const executedCount = executions.filter(
        (execution) =>
          execution.date === day.date && execution.status === "executed"
      ).length

      const plannedCount =
        countWorkoutPlansByDate(day.date, plans) +
        countPlanningEventsByDate(filteredPlanningEvents, day.date, "all")
      const thumb =
        dayExecutionWithPhoto?.photoUrl ||
        dayActivities.find((activity) => Boolean(activity.photoUrl))
          ?.photoUrl ||
        dayMeals.find((meal) => Boolean(meal.photoUrl))?.photoUrl

      markerMap.set(day.date, {
        meals: dayMeals.length,
        planned: plannedCount,
        executed: executedCount,
        activities: dayActivities.length,
        thumb,
        streakStatus: streakStatusByDate.get(day.date),
        competition: groupActivityDates.has(day.date),
        hydrationGoalHit: hydrationGoalHitDates.has(day.date),
      })
    })

    return markerMap
  }, [
    activities,
    executions,
    filteredPlanningEvents,
    groupActivityDates,
    hydrationGoalHitDates,
    meals,
    monthDates,
    monthGrid,
    plans,
    workouts,
  ])

  const dayMeals = useMemo<Meal[]>(
    () => meals.filter((meal) => meal.date === selectedDate),
    [meals, selectedDate]
  )

  const dayExecutions = useMemo<WorkoutExecution[]>(
    () => executions.filter((execution) => execution.date === selectedDate),
    [executions, selectedDate]
  )
  const dayActivities = useMemo<Activity[]>(
    () => activities.filter((activity) => activity.date === selectedDate),
    [activities, selectedDate]
  )

  const daySummaryDuration = dayExecutions.reduce(
    (acc, item) => acc + (item.durationMinutes ?? 0),
    0
  )
  const todayMeals = useMemo(
    () => meals.filter((meal) => meal.date === today),
    [meals, today]
  )
  const activePlan = useMemo(
    () => plans.find((plan) => plan.status === "active") ?? null,
    [plans]
  )
  const todayWorkout = useMemo(() => {
    if (!activePlan) {
      return null
    }

    const weekday = getTodayWeekday()

    return (
      workouts.find(
        (workout) =>
          workout.planId === activePlan.id && workout.weekday === weekday
      ) ??
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
    () =>
      executions.find((execution) => execution.status === "executed") ?? null,
    [executions]
  )
  const overviewMetrics = useMemo(
    () =>
      buildCalendarOverviewMetrics({
        report,
        mealsTodayCount: todayMeals.length,
      }),
    [report, todayMeals.length]
  )
  const loadingOverview =
    mealsLoading || workoutsLoading || activitiesLoading || isLoadingReport
  const streakSummary = useMemo(
    () => getStreakSummary(plans, workouts, executions, activities, today),
    [activities, executions, plans, today, workouts]
  )
  const streakCalendar = useMemo(
    () =>
      getCalendarStreakStatuses(
        getLastNDates(14),
        plans,
        workouts,
        executions,
        activities
      ),
    [activities, executions, plans, workouts]
  )
  const userName =
    user?.displayName?.trim() || user?.email?.split("@")[0] || "atleta"
  const hasWorkoutToday = executions.some(
    (execution) =>
      execution.date === today &&
      (execution.status === "executed" ||
        execution.status === "partial" ||
        execution.status === "in_progress")
  )
  const hasRegisteredActivityToday = activities.some(
    (activity) => activity.date === today
  )
  const hasActiveDayToday = hasWorkoutToday || hasRegisteredActivityToday
  const streakBadgeActive = hasActiveDayToday

  async function submitPlanningEvent(values: PlanningEventFormValues) {
    if (!user?.uid) {
      return
    }

    setIsPlanningSubmitting(true)
    try {
      if (editingPlanningEvent) {
        await updatePlanningEvent(editingPlanningEvent.id, values)
      } else {
        await createPlanningEvent({
          ...values,
          userId: user.uid,
          recurrence: values.recurrence ?? "none",
          status: "planned",
        })
      }

      setEditingPlanningEvent(undefined)
      setIsPlanningFormSheetOpen(false)
      await loadPlanningEvents()
    } finally {
      setIsPlanningSubmitting(false)
    }
  }

  async function handleDeletePlanning(eventId: string) {
    await deletePlanningEvent(eventId)
    await loadPlanningEvents()
  }

  async function handleMarkPlanningCompleted(eventId: string) {
    await markPlanningEventCompleted(eventId)
    await loadPlanningEvents()
  }

  async function handleMarkPlanningSkipped(eventId: string) {
    await markPlanningEventSkipped(eventId)
    await loadPlanningEvents()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendario"
        description="Visao mensal com execucoes, refeicoes, atividades e planejamentos."
      />

      <section className="flex flex-col gap-3">
        <Badge
          variant={streakBadgeActive ? "default" : "secondary"}
          className="w-fit rounded-full px-3 py-1 text-xs"
        >
          <Flame
            className="mr-1.5 size-3.5"
            weight={streakBadgeActive ? "fill" : "regular"}
          />
          {streakSummary.currentStreak} ofensiva
          {streakSummary.currentStreak === 1 ? "" : "s"}
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ola, {userName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Aqui esta seu resumo diario.
            {hasActiveDayToday
              ? " Voce ja se manteve ativo hoje."
              : " Vamos ativar o dia com um treino ou atividade."}
          </p>
        </div>
      </section>

      {isLoadingChallenge ? (
        <Skeleton className="h-40 w-full" />
      ) : challengeBanner ? (
        <GroupChallengeBanner data={challengeBanner} />
      ) : null}

      <section className="flex flex-col gap-3">
        <StreakCard
          summary={streakSummary}
          userName={userName}
          isActiveToday={hasActiveDayToday}
        />
        <StreakCalendar
          statuses={streakCalendar}
          isActiveToday={hasActiveDayToday}
        />
      </section>

      {loadingOverview ? (
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
          {overviewMetrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              progress={metric.progress}
            />
          ))}
        </section>
      )}

      <TodaySummary
        todayWorkout={todayWorkout}
        mealsToday={todayMeals}
        lastExecution={lastExecuted}
        todayExecution={todayExecution}
      />

      <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <p className="mb-2 text-sm text-muted-foreground">Selecione o mes</p>
        <Input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="max-w-xs"
        />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={
                planningTypeFilter === option.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => setPlanningTypeFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingPlanningEvent(undefined)
            setIsPlanningFormSheetOpen(true)
          }}
        >
          <Plus className="mr-1 size-4" />
          Novo planejamento
        </Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
          <div className="sm:hidden">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              <span>D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span>S</span>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {monthGrid.map((day) => {
                const marker = markersByDate.get(day.date) ?? {
                  meals: 0,
                  planned: 0,
                  executed: 0,
                  activities: 0,
                  competition: false,
                  hydrationGoalHit: false,
                }
                const dayNumber = Number(day.date.slice(-2))
                const hasEvents =
                  marker.meals +
                    marker.planned +
                    marker.executed +
                    marker.activities >
                  0
                const hasPhoto = Boolean(marker.thumb)

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.date)
                      setShowDaySheet(true)
                    }}
                    className={`h-[4.8rem] rounded-lg border px-1 py-1 text-left transition ${
                      selectedDate === day.date
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/70"
                    } ${day.inCurrentMonth ? "opacity-100" : "opacity-40"}`}
                  >
                    <div className="flex h-full flex-col items-center justify-between">
                      <p className="text-[11px] leading-none font-semibold">
                        {dayNumber}
                      </p>

                      <div className="flex min-h-[1.25rem] items-center justify-center">
                        {hasPhoto ? (
                          <span
                            className="size-5 overflow-hidden rounded-full border border-border/70 ring-1 ring-background"
                            title="Dia com foto"
                          >
                            <Image
                              src={marker.thumb!}
                              alt={`Foto ${day.date}`}
                              width={40}
                              height={40}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          </span>
                        ) : (
                          <span className="size-5 rounded-full border border-dashed border-border/50 bg-muted/20" />
                        )}
                      </div>

                      <div className="flex min-h-2 items-center justify-center gap-1">
                        {hasEvents ? (
                          <>
                            {marker.meals > 0 ? (
                              <span
                                className="size-1.5 rounded-full bg-chart-2"
                                title="Refeicao"
                              />
                            ) : null}
                            {marker.planned > 0 ? (
                              <span
                                className="size-1.5 rounded-full bg-chart-4"
                                title="Planejado"
                              />
                            ) : null}
                            {marker.executed > 0 ? (
                              <span
                                className="size-1.5 rounded-full bg-chart-1"
                                title="Executado"
                              />
                            ) : null}
                            {marker.activities > 0 ? (
                              <span
                                className="size-1.5 rounded-full bg-primary"
                                title="Atividade"
                              />
                            ) : null}
                          </>
                        ) : null}
                        {marker.hydrationGoalHit ? (
                          <span
                            className="size-1.5 rounded-full bg-primary"
                            title="Meta de agua batida"
                          />
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sab</span>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {monthGrid.map((day) => {
                const marker = markersByDate.get(day.date) ?? {
                  meals: 0,
                  planned: 0,
                  executed: 0,
                  activities: 0,
                  competition: false,
                  hydrationGoalHit: false,
                }
                const dayNumber = Number(day.date.slice(-2))
                const hasEvents =
                  marker.meals +
                    marker.planned +
                    marker.executed +
                    marker.activities >
                  0

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.date)
                      setShowDaySheet(true)
                    }}
                    className={`aspect-square min-h-24 rounded-xl border p-1.5 text-left transition ${
                      selectedDate === day.date
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/70 hover:border-primary/30"
                    } ${day.inCurrentMonth ? "opacity-100" : "opacity-35"}`}
                  >
                    <div className="flex h-full flex-col">
                      <p className="text-xs leading-none font-semibold">
                        {dayNumber}
                      </p>

                      <div className="mt-1 h-10 w-full shrink-0 rounded-md">
                        {marker.thumb ? (
                          <Image
                            src={marker.thumb}
                            alt={`Foto ${day.date}`}
                            width={200}
                            height={120}
                            unoptimized
                            className="h-full w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-full w-full rounded-md border border-dashed border-border/50 bg-muted/20" />
                        )}
                      </div>

                      <div className="mt-1 flex min-h-2 items-center gap-1">
                        {hasEvents ? (
                          <>
                            {marker.meals > 0 ? (
                              <span
                                className="size-2 rounded-full bg-chart-2"
                                title="Refeicao"
                              />
                            ) : null}
                            {marker.planned > 0 ? (
                              <span
                                className="size-2 rounded-full bg-chart-4"
                                title="Planejado"
                              />
                            ) : null}
                            {marker.executed > 0 ? (
                              <span
                                className="size-2 rounded-full bg-chart-1"
                                title="Executado"
                              />
                            ) : null}
                            {marker.activities > 0 ? (
                              <span
                                className="size-2 rounded-full bg-primary"
                                title="Atividade"
                              />
                            ) : null}
                          </>
                        ) : null}
                        {marker.hydrationGoalHit ? (
                          <span
                            className="size-2 rounded-full bg-primary"
                            title="Meta de agua batida"
                          />
                        ) : null}
                      </div>

                      <div className="mt-1">
                        {marker.streakStatus ? (
                          <p className="truncate text-[9px] text-muted-foreground">
                            {getStreakStatusLabel(marker.streakStatus)}
                          </p>
                        ) : null}
                        {marker.competition ? (
                          <Badge
                            variant="secondary"
                            className="mt-1 px-1 py-0 text-[9px]"
                          >
                            competicao
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <aside className="hidden space-y-4 lg:block">
          <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <p className="text-sm font-medium">Resumo do dia</p>
            <p className="mt-1 text-sm text-muted-foreground">{selectedDate}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Refeicoes: {dayMeals.length}</Badge>
              <Badge variant="outline">Treinos: {dayExecutions.length}</Badge>
              <Badge variant="outline">
                Atividades: {dayActivities.length}
              </Badge>
              <Badge variant="outline">
                Planejamentos: {selectedDatePlanningEvents.length}
              </Badge>
              <Badge>Duracao: {daySummaryDuration} min</Badge>
            </div>
            {dayExecutions.slice(0, 2).map((execution) => (
              <Link
                key={execution.id}
                href={`/workouts?tab=history&executionId=${execution.id}`}
                className="mt-2 block text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {workoutNameById[execution.workoutId] ?? "Treino"}:{" "}
                {getWorkoutExecutionStatusLabel(execution.status)}
              </Link>
            ))}
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <DayDetails
              flat
              date={selectedDate}
              meals={dayMeals}
              executions={dayExecutions}
              activities={dayActivities}
              workoutNameById={workoutNameById}
            />
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Planejamentos do dia</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingPlanningEvent(undefined)
                  setIsPlanningFormSheetOpen(true)
                }}
              >
                Novo
              </Button>
            </div>
            <PlanningDayDetails
              date={selectedDate}
              events={selectedDatePlanningEvents}
              onEdit={(event) => {
                setEditingPlanningEvent(event)
                setIsPlanningFormSheetOpen(true)
              }}
              onDelete={(eventId) => void handleDeletePlanning(eventId)}
              onMarkCompleted={(eventId) =>
                void handleMarkPlanningCompleted(eventId)
              }
              onMarkSkipped={(eventId) =>
                void handleMarkPlanningSkipped(eventId)
              }
            />
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <p className="text-sm font-medium">Proximos planejamentos</p>
        <div className="mt-3 space-y-2">
          {isPlanningLoading ? (
            <>
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </>
          ) : upcomingPlanningEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem eventos futuros planejados.
            </p>
          ) : (
            upcomingPlanningEvents.map((event) => (
              <Card key={event.id} className="border-border/70">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.date} - {event.startTime} -{" "}
                      {getPlanningEventTypeLabel(event.type)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {getPlanningStatusLabel(event.status)}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {showDaySheet ? (
        <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm lg:hidden">
          <div className="flex h-[100dvh] w-full flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Detalhes do dia</p>
                <p className="text-xs text-muted-foreground">{selectedDate}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowDaySheet(false)}
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Refeicoes: {dayMeals.length}
                  </Badge>
                  <Badge variant="outline">
                    Treinos: {dayExecutions.length}
                  </Badge>
                  <Badge variant="outline">
                    Atividades: {dayActivities.length}
                  </Badge>
                  <Badge variant="outline">
                    Planejamentos: {selectedDatePlanningEvents.length}
                  </Badge>
                  <Badge>Duracao: {daySummaryDuration} min</Badge>
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
                <DayDetails
                  flat
                  date={selectedDate}
                  meals={dayMeals}
                  executions={dayExecutions}
                  activities={dayActivities}
                  workoutNameById={workoutNameById}
                />
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Planejamentos do dia</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowDaySheet(false)
                      setEditingPlanningEvent(undefined)
                      setIsPlanningFormSheetOpen(true)
                    }}
                  >
                    Novo
                  </Button>
                </div>
                <PlanningDayDetails
                  date={selectedDate}
                  events={selectedDatePlanningEvents}
                  onEdit={(event) => {
                    setShowDaySheet(false)
                    setEditingPlanningEvent(event)
                    setIsPlanningFormSheetOpen(true)
                  }}
                  onDelete={(eventId) => void handleDeletePlanning(eventId)}
                  onMarkCompleted={(eventId) =>
                    void handleMarkPlanningCompleted(eventId)
                  }
                  onMarkSkipped={(eventId) =>
                    void handleMarkPlanningSkipped(eventId)
                  }
                />
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <PlanningEventSheet
        open={isPlanningFormSheetOpen}
        onOpenChange={(open) => {
          setIsPlanningFormSheetOpen(open)
          if (!open) {
            setEditingPlanningEvent(undefined)
          }
        }}
        title={
          editingPlanningEvent ? "Editar planejamento" : "Novo planejamento"
        }
        subtitle={parseIsoDateLocal(
          editingPlanningEvent?.date ?? selectedDate
        ).toLocaleDateString("pt-BR")}
      >
        <PlanningEventForm
          selectedDate={selectedDate}
          initialEvent={editingPlanningEvent}
          workouts={workouts}
          plans={plans}
          isSubmitting={isPlanningSubmitting}
          onSubmit={submitPlanningEvent}
          onCancel={() => {
            setEditingPlanningEvent(undefined)
            setIsPlanningFormSheetOpen(false)
          }}
        />
      </PlanningEventSheet>
    </div>
  )
}
