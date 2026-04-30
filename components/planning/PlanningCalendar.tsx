"use client"

import { todayIsoDate, toIsoDate } from "@/lib/date"
import type { PlanningEvent } from "@/types/planning"

interface PlanningCalendarDay {
  date: string
  inCurrentMonth: boolean
}

function buildMonthGrid(monthValue: string): PlanningCalendarDay[] {
  const [yearValue, monthPart] = monthValue.split("-")
  const year = Number(yearValue)
  const month = Number(monthPart) - 1
  const firstDay = new Date(year, month, 1)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())

  const days: PlanningCalendarDay[] = []
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

export function PlanningCalendar({
  month,
  selectedDate,
  events,
  onMonthChange,
  onSelectDate,
}: {
  month: string
  selectedDate: string
  events: PlanningEvent[]
  onMonthChange: (value: string) => void
  onSelectDate: (date: string) => void
}) {
  const monthGrid = buildMonthGrid(month)

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Calendario de planejamento</p>
        <input
          type="month"
          value={month}
          onChange={(event) => onMonthChange(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground sm:text-xs">
        <span>Dom</span>
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sab</span>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {monthGrid.map((day) => {
          const dayNumber = Number(day.date.slice(-2))
          const eventsForDay = events.filter((event) => event.date === day.date)
          const meals = eventsForDay.filter((event) => event.type === "meal").length
          const workouts = eventsForDay.filter((event) => event.type === "workout").length
          const activities = eventsForDay.filter((event) => event.type === "activity").length
          const isSelected = selectedDate === day.date
          const isToday = todayIsoDate() === day.date

          return (
            <button
              key={day.date}
              type="button"
              className={`min-h-16 rounded-xl border p-1 text-left transition min-[390px]:min-h-[4.5rem] sm:min-h-24 sm:p-1.5 ${
                isSelected
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/70 hover:border-primary/30"
              } ${day.inCurrentMonth ? "opacity-100" : "opacity-35"}`}
              onClick={() => onSelectDate(day.date)}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold sm:text-xs">{dayNumber}</p>
                {isToday ? <span className="size-1.5 rounded-full bg-primary" /> : null}
              </div>

              <div className="mt-1 flex flex-wrap gap-1">
                {workouts > 0 ? <span className="size-2 rounded-full bg-primary" title="Treinos" /> : null}
                {meals > 0 ? <span className="size-2 rounded-full bg-muted-foreground/80" title="Refeicoes" /> : null}
                {activities > 0 ? (
                  <span className="size-2 rounded-full border border-primary/50 bg-transparent" title="Atividades" />
                ) : null}
              </div>
              {eventsForDay.length > 0 ? (
                <p className="mt-1 truncate text-[9px] text-muted-foreground">
                  {eventsForDay.length} evento{eventsForDay.length > 1 ? "s" : ""}
                </p>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
