"use client"

import { useEffect, useMemo, useState } from "react"

import { Plus } from "@phosphor-icons/react"

import { PlanningCalendar } from "@/components/planning/PlanningCalendar"
import {
  PlanningEventForm,
  type PlanningEventFormValues,
} from "@/components/planning/PlanningEventForm"
import { PlanningEventSheet } from "@/components/planning/PlanningEventSheet"
import { PlanningDayDetails } from "@/components/planning/PlanningDayDetails"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { parseIsoDateLocal, todayIsoDate, toIsoDate } from "@/lib/date"
import { getPlanningEventTypeLabel, getPlanningStatusLabel } from "@/lib/labels"
import { useAuth } from "@/hooks/useAuth"
import {
  createPlanningEvent,
  deletePlanningEvent,
  getPlanningEventsByUser,
  markPlanningEventCompleted,
  markPlanningEventSkipped,
  updatePlanningEvent,
} from "@/services/planningService"
import type { PlanningEvent, PlanningEventType } from "@/types/planning"
import { useWorkouts } from "@/hooks/useWorkouts"

const filterOptions: Array<{ value: "all" | PlanningEventType; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "meal", label: "Refeicoes" },
  { value: "workout", label: "Treinos" },
  { value: "activity", label: "Atividades" },
]

function getMonthRange(monthValue: string) {
  const [yearValue, monthPart] = monthValue.split("-")
  const year = Number(yearValue)
  const month = Number(monthPart) - 1
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  }
}

export default function PlanningPage() {
  const { user } = useAuth()
  const { plans, workouts } = useWorkouts(user?.uid)
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(todayIsoDate())
  const [events, setEvents] = useState<PlanningEvent[]>([])
  const [typeFilter, setTypeFilter] = useState<"all" | PlanningEventType>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false)
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PlanningEvent | undefined>()

  async function loadEvents(nextMonth = month) {
    if (!user?.uid) {
      setEvents([])
      return
    }

    setIsLoading(true)
    try {
      const range = getMonthRange(nextMonth)
      const loadedEvents = await getPlanningEventsByUser(user.uid, range)
      setEvents(loadedEvents)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, month])

  const filteredEvents = useMemo(() => {
    if (typeFilter === "all") {
      return events
    }
    return events.filter((event) => event.type === typeFilter)
  }, [events, typeFilter])

  const selectedDateEvents = useMemo(
    () =>
      filteredEvents
        .filter((event) => event.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [filteredEvents, selectedDate]
  )

  const upcomingEvents = useMemo(() => {
    const today = todayIsoDate()
    return filteredEvents
      .filter((event) => event.date >= today && event.status === "planned")
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) {
          return dateCompare
        }

        return a.startTime.localeCompare(b.startTime)
      })
      .slice(0, 4)
  }, [filteredEvents])

  async function submitPlanningEvent(values: PlanningEventFormValues) {
    if (!user?.uid) {
      return
    }

    setIsSubmitting(true)
    try {
      if (editingEvent) {
        await updatePlanningEvent(editingEvent.id, values)
      } else {
        await createPlanningEvent({
          ...values,
          userId: user.uid,
          recurrence: values.recurrence ?? "none",
          status: "planned",
        })
      }

      setEditingEvent(undefined)
      setIsFormSheetOpen(false)
      await loadEvents()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(eventId: string) {
    await deletePlanningEvent(eventId)
    await loadEvents()
  }

  async function handleMarkCompleted(eventId: string) {
    await markPlanningEventCompleted(eventId)
    await loadEvents()
  }

  async function handleMarkSkipped(eventId: string) {
    await markPlanningEventSkipped(eventId)
    await loadEvents()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Planejamento"
        description="Planeje refeicoes, treinos e atividades futuras em um calendario dedicado."
      />

      <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={typeFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingEvent(undefined)
            setIsFormSheetOpen(true)
          }}
        >
          <Plus className="mr-1 size-4" />
          Novo planejamento
        </Button>
      </section>

      <PlanningCalendar
        month={month}
        selectedDate={selectedDate}
        events={filteredEvents}
        onMonthChange={(value) => setMonth(value)}
        onSelectDate={(date) => {
          setSelectedDate(date)
          setIsDaySheetOpen(true)
        }}
      />

      <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <p className="text-sm font-medium">Proximos planejamentos</p>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos futuros planejados.</p>
          ) : (
            upcomingEvents.map((event) => (
              <Card key={event.id} className="border-border/70">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.date} • {event.startTime} • {getPlanningEventTypeLabel(event.type)}
                    </p>
                  </div>
                  <Badge variant="secondary">{getPlanningStatusLabel(event.status)}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <PlanningEventSheet
        open={isDaySheetOpen}
        onOpenChange={setIsDaySheetOpen}
        title="Planejamentos do dia"
        subtitle={selectedDate}
      >
        <PlanningDayDetails
          date={selectedDate}
          events={selectedDateEvents}
          onEdit={(event) => {
            setEditingEvent(event)
            setIsFormSheetOpen(true)
          }}
          onDelete={(eventId) => void handleDelete(eventId)}
          onMarkCompleted={(eventId) => void handleMarkCompleted(eventId)}
          onMarkSkipped={(eventId) => void handleMarkSkipped(eventId)}
        />
      </PlanningEventSheet>

      <PlanningEventSheet
        open={isFormSheetOpen}
        onOpenChange={(open) => {
          setIsFormSheetOpen(open)
          if (!open) {
            setEditingEvent(undefined)
          }
        }}
        title={editingEvent ? "Editar planejamento" : "Novo planejamento"}
        subtitle={parseIsoDateLocal(editingEvent?.date ?? selectedDate).toLocaleDateString("pt-BR")}
      >
        <PlanningEventForm
          selectedDate={selectedDate}
          initialEvent={editingEvent}
          workouts={workouts}
          plans={plans}
          isSubmitting={isSubmitting}
          onSubmit={submitPlanningEvent}
          onCancel={() => {
            setEditingEvent(undefined)
            setIsFormSheetOpen(false)
          }}
        />
      </PlanningEventSheet>
    </div>
  )
}
