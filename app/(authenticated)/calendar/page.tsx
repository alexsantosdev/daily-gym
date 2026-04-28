"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { X } from "@phosphor-icons/react"

import { DayDetails } from "@/components/calendar/DayDetails"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { useActivities } from "@/hooks/useActivities"
import { useMeals } from "@/hooks/useMeals"
import { useWorkouts } from "@/hooks/useWorkouts"
import { getWorkoutExecutionStatusLabel, getStreakStatusLabel } from "@/lib/labels"
import { getGroupActivities } from "@/services/groupActivityService"
import { getUserGroups } from "@/services/groupService"
import { getCalendarStreakStatuses } from "@/services/streakService"
import type { Activity } from "@/types/activity"
import type { Meal } from "@/types/meal"
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
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

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

function countPlannedByDate(date: string, plans: WorkoutPlan[]) {
  const weekday = new Date(date).getDay()

  return plans.filter((plan) => plan.status === "active" && plan.weekdays.includes(weekday)).length
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { activities } = useActivities(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })
  const { meals } = useMeals(user?.uid)
  const { executions, plans, workouts } = useWorkouts(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [groupActivityDates, setGroupActivityDates] = useState<Set<string>>(new Set())
  const [showDaySheet, setShowDaySheet] = useState(false)

  const monthGrid = useMemo(() => buildMonthGrid(month), [month])
  const monthDates = useMemo(() => monthGrid.map((day) => day.date), [monthGrid])

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

  const workoutNameById = useMemo(
    () => Object.fromEntries(workouts.map((workout) => [workout.id, workout.name])),
    [workouts]
  )

  const markersByDate = useMemo(() => {
    const markerMap = new Map<string, DayMarker>()
    const streakStatusByDate = new Map(
      getCalendarStreakStatuses(monthDates, plans, workouts, executions).map((item) => [item.date, item.status])
    )

    monthGrid.forEach((day) => {
      const dayMeals = meals.filter((meal) => meal.date === day.date)
      const dayActivities = activities.filter((activity) => activity.date === day.date)
      const dayExecutionWithPhoto = executions.find(
        (execution) => execution.date === day.date && Boolean(execution.photoUrl)
      )
      const executedCount = executions.filter(
        (execution) => execution.date === day.date && execution.status === "executed"
      ).length

      const plannedCount = countPlannedByDate(day.date, plans)
      const thumb =
        dayExecutionWithPhoto?.photoUrl ||
        dayActivities.find((activity) => Boolean(activity.photoUrl))?.photoUrl ||
        dayMeals.find((meal) => Boolean(meal.photoUrl))?.photoUrl

      markerMap.set(day.date, {
        meals: dayMeals.length,
        planned: plannedCount,
        executed: executedCount,
        activities: dayActivities.length,
        thumb,
        streakStatus: streakStatusByDate.get(day.date),
        competition: groupActivityDates.has(day.date),
      })
    })

    return markerMap
  }, [activities, executions, groupActivityDates, meals, monthDates, monthGrid, plans, workouts])

  const dayMeals = useMemo<Meal[]>(() => meals.filter((meal) => meal.date === selectedDate), [meals, selectedDate])

  const dayExecutions = useMemo<WorkoutExecution[]>(
    () => executions.filter((execution) => execution.date === selectedDate),
    [executions, selectedDate]
  )
  const dayActivities = useMemo<Activity[]>(
    () => activities.filter((activity) => activity.date === selectedDate),
    [activities, selectedDate]
  )

  const daySummaryDuration = dayExecutions.reduce((acc, item) => acc + (item.durationMinutes ?? 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader title="Calendario" description="Visao mensal com treinos, refeicoes, atividades e fotos do dia." />

      <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <p className="mb-2 text-sm text-muted-foreground">Selecione o mes</p>
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="max-w-xs" />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground sm:gap-2 sm:text-xs">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sab</span>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
            {monthGrid.map((day) => {
              const marker = markersByDate.get(day.date) ?? {
                meals: 0,
                planned: 0,
                executed: 0,
                activities: 0,
                competition: false,
              }
              const dayNumber = Number(day.date.slice(-2))
              const hasEvents = marker.meals + marker.planned + marker.executed + marker.activities > 0

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day.date)
                    setShowDaySheet(true)
                  }}
                  className={`min-h-16 rounded-xl border p-1 text-left transition min-[390px]:min-h-[4.5rem] sm:min-h-24 sm:p-1.5 ${
                    selectedDate === day.date
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/70 hover:border-primary/30"
                  } ${day.inCurrentMonth ? "opacity-100" : "opacity-35"}`}
                >
                  <p className="text-[11px] font-semibold sm:text-xs">{dayNumber}</p>
                  {marker.thumb ? (
                    <Image
                      src={marker.thumb}
                      alt={`Foto ${day.date}`}
                      width={200}
                      height={120}
                      unoptimized
                      className="mt-1 h-8 w-full rounded-lg object-cover sm:h-10"
                    />
                  ) : null}
                  {hasEvents ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {marker.meals > 0 ? <span className="size-2 rounded-full bg-chart-2" title="Refeicao" /> : null}
                      {marker.planned > 0 ? <span className="size-2 rounded-full bg-chart-4" title="Planejado" /> : null}
                      {marker.executed > 0 ? <span className="size-2 rounded-full bg-chart-1" title="Executado" /> : null}
                      {marker.activities > 0 ? <span className="size-2 rounded-full bg-primary" title="Atividade" /> : null}
                    </div>
                  ) : null}
                  {marker.streakStatus ? (
                    <p className="mt-1 truncate text-[9px] text-muted-foreground">
                      {getStreakStatusLabel(marker.streakStatus)}
                    </p>
                  ) : null}
                  {marker.competition ? (
                    <Badge variant="secondary" className="mt-1 px-1 py-0 text-[9px]">
                      competicao
                    </Badge>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <aside className="hidden space-y-4 lg:block">
          <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <p className="text-sm font-medium">Resumo do dia</p>
            <p className="mt-1 text-sm text-muted-foreground">{selectedDate}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Refeicoes: {dayMeals.length}</Badge>
              <Badge variant="outline">Treinos: {dayExecutions.length}</Badge>
              <Badge variant="outline">Atividades: {dayActivities.length}</Badge>
              <Badge>Duracao: {daySummaryDuration} min</Badge>
            </div>
            {dayExecutions.slice(0, 2).map((execution) => (
              <Link
                key={execution.id}
                href={`/workouts?tab=history&executionId=${execution.id}`}
                className="mt-2 block text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {workoutNameById[execution.workoutId] ?? "Treino"}: {getWorkoutExecutionStatusLabel(execution.status)}
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
        </aside>
      </div>

      {showDaySheet ? (
        <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm lg:hidden">
          <div className="flex h-[100dvh] w-full flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Detalhes do dia</p>
                <p className="text-xs text-muted-foreground">{selectedDate}</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowDaySheet(false)}>
                <X className="size-4" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <section className="mb-3 rounded-2xl border border-border/70 bg-card/60 p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Refeicoes: {dayMeals.length}</Badge>
                  <Badge variant="outline">Treinos: {dayExecutions.length}</Badge>
                  <Badge variant="outline">Atividades: {dayActivities.length}</Badge>
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
