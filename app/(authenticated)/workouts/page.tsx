"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { PencilSimpleLine, Plus, Trash } from "@phosphor-icons/react"

import { ActivityHistoryList } from "@/components/activities/ActivityHistoryList"
import { ActivityForm, type ActivityFormValues } from "@/components/activities/ActivityForm"
import { PageHeader } from "@/components/layout/page-header"
import { WorkoutExecutionForm } from "@/components/workouts/WorkoutExecutionForm"
import { WorkoutExecutionSheet } from "@/components/workouts/WorkoutExecutionSheet"
import { WorkoutForm } from "@/components/workouts/workout-form"
import { WorkoutPlanForm, type WorkoutPlanFormValues } from "@/components/workouts/workout-plan-form"
import { WorkoutHistoryList } from "@/components/workouts/WorkoutHistoryList"
import { WorkoutPlanList } from "@/components/workouts/WorkoutPlanList"
import { WorkoutTodayCard } from "@/components/workouts/WorkoutTodayCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getTodayWeekday, getWeekdayLabel, todayIsoDate } from "@/lib/date"
import { useActivities } from "@/hooks/useActivities"
import { useAuth } from "@/hooks/useAuth"
import { useWorkouts } from "@/hooks/useWorkouts"
import { getWorkoutPlanStatusLabel } from "@/lib/labels"
import { uploadActivityPhoto } from "@/services/activityService"
import { markPlanningEventCompleted } from "@/services/planningService"
import type { Activity } from "@/types/activity"
import type { Workout, WorkoutPlan } from "@/types/workout"

export default function WorkoutsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const startParamRaw = searchParams.get("start")
  const plannedEventId = searchParams.get("plannedEventId")
  const executionIdParam = searchParams.get("executionId")
  const startMode = Boolean(startParamRaw)
  const requestedWorkoutId = startParamRaw && startParamRaw !== "1" ? startParamRaw : undefined
  const tabParam = searchParams.get("tab")

  const { user } = useAuth()
  const userName = user?.displayName?.trim() || user?.email?.split("@")[0] || "Atleta"
  const {
    plans,
    workouts,
    executions,
    isLoading,
    createPlan,
    editPlan,
    removePlan,
    createWorkoutEntry,
    editWorkoutEntry,
    removeWorkoutEntry,
    createExecutionEntry,
    removeExecutionEntry,
  } = useWorkouts(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })
  const { activities, updateActivityEntry, deleteActivityEntry } = useActivities(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })

  const [activeTab, setActiveTab] = useState<string>(
    executionIdParam
      ? "history"
      : tabParam === "plans" || tabParam === "history" || tabParam === "workouts" || tabParam === "today"
        ? tabParam
        : "today"
  )

  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>()
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | undefined>()
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false)
  const [isWorkoutFormOpen, setIsWorkoutFormOpen] = useState(false)
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false)
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false)
  const [isSubmittingExecution, setIsSubmittingExecution] = useState(false)
  const [isSubmittingActivityHistory, setIsSubmittingActivityHistory] = useState(false)
  const [editingActivityHistory, setEditingActivityHistory] = useState<Activity | undefined>()
  const [isExecutionSheetOpen, setIsExecutionSheetOpen] = useState(startMode)

  const workoutPlanLookup = useMemo(() => Object.fromEntries(plans.map((plan) => [plan.id, plan.name])), [plans])

  const workoutNameById = useMemo(
    () => Object.fromEntries(workouts.map((workout) => [workout.id, workout.name])),
    [workouts]
  )

  const workoutsById = useMemo(() => Object.fromEntries(workouts.map((workout) => [workout.id, workout])), [workouts])
  const plansById = useMemo(() => Object.fromEntries(plans.map((plan) => [plan.id, plan])), [plans])

  const activePlan = useMemo(() => plans.find((plan) => plan.status === "active") ?? null, [plans])
  const todayWeekday = getTodayWeekday()

  const todayWorkout = useMemo(() => {
    if (!activePlan) {
      return null
    }

    return (
      workouts.find((workout) => workout.planId === activePlan.id && workout.weekday === todayWeekday) ??
      workouts.find((workout) => workout.planId === activePlan.id) ??
      null
    )
  }, [activePlan, todayWeekday, workouts])

  const todayExecution = useMemo(() => {
    const today = todayIsoDate()
    const todayExecutions = executions.filter(
      (execution) =>
        execution.date === today &&
        (execution.status === "executed" || execution.status === "partial" || execution.status === "in_progress")
    )

    if (todayExecutions.length === 0) {
      return null
    }

    return [...todayExecutions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  }, [executions])

  const todayExecutionWorkout = todayExecution
    ? workouts.find((workout) => workout.id === todayExecution.workoutId) ?? null
    : null
  const todayExecutionPlan = todayExecution
    ? plans.find((plan) => plan.id === todayExecution.planId) ?? null
    : null

  const hasExecutionToday = useMemo(() => {
    const today = todayIsoDate()
    return executions.some(
      (execution) =>
        execution.date === today &&
        (execution.status === "executed" || execution.status === "partial" || execution.status === "in_progress")
    )
  }, [executions])

  const executionInitialPlanId = activePlan?.id ?? plans[0]?.id

  const executionInitialWorkoutId = useMemo(() => {
    if (requestedWorkoutId && workouts.some((workout) => workout.id === requestedWorkoutId)) {
      return requestedWorkoutId
    }

    return todayWorkout?.id
  }, [requestedWorkoutId, todayWorkout?.id, workouts])

  async function submitActivityFromHistory(values: ActivityFormValues) {
    if (!editingActivityHistory || !user?.uid) {
      return
    }

    setIsSubmittingActivityHistory(true)
    try {
      const photoUrl = values.photoFile ? await uploadActivityPhoto(user.uid, values.photoFile) : editingActivityHistory.photoUrl

      await updateActivityEntry(editingActivityHistory.id, {
        name: values.name,
        type: values.type,
        date: values.date,
        durationMinutes: values.durationMinutes,
        notes: values.notes || undefined,
        photoUrl,
      })

      setEditingActivityHistory(undefined)
    } finally {
      setIsSubmittingActivityHistory(false)
    }
  }

  if (startMode) {
    return (
      <WorkoutExecutionSheet
        open={isExecutionSheetOpen}
        onOpenChange={(open) => {
          setIsExecutionSheetOpen(open)
          if (!open) {
            router.replace("/workouts?tab=today")
          }
        }}
        title="Execucao de treino"
        subtitle="Foco total na ficha"
      >
        <WorkoutExecutionForm
          plans={plans}
          workouts={workouts}
          immersive
          initialPlanId={executionInitialPlanId}
          initialWorkoutId={executionInitialWorkoutId}
          hasExecutionToday={hasExecutionToday}
          isSubmitting={isSubmittingExecution}
          onSubmit={async (payload) => {
            setIsSubmittingExecution(true)
            try {
              await createExecutionEntry(payload)
              if (plannedEventId) {
                await markPlanningEventCompleted(plannedEventId)
              }
            } finally {
              setIsSubmittingExecution(false)
            }
          }}
          onExecutionCompleted={() => {
            setActiveTab("history")
            setIsExecutionSheetOpen(false)
            router.replace("/workouts?tab=history")
          }}
        />
      </WorkoutExecutionSheet>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Treinos"
        description="Rotina do dia, planos e historico em uma experiencia mais direta no celular."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto grid-cols-2 gap-1 sm:inline-flex sm:h-10">
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="workouts">Treinos</TabsTrigger>
          <TabsTrigger value="history">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <WorkoutTodayCard
            plannedWorkout={todayWorkout}
            plannedPlan={activePlan}
            executionToday={todayExecution}
            executionWorkout={todayExecutionWorkout}
            executionPlan={todayExecutionPlan}
          />

          <section className="space-y-2">
            <Button className="h-12 w-full" onClick={() => setIsExecutionSheetOpen(true)}>
              {hasExecutionToday ? "Treinar novamente" : "Iniciar treino"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Abra a ficha em tela cheia para executar seu treino sem distracoes.
            </p>
          </section>

          {activePlan ? (
            <section className="rounded-xl border border-border/60 bg-card/50 p-3">
              <p className="text-xs text-muted-foreground">Plano ativo</p>
              <p className="text-sm font-medium">{activePlan.name}</p>
              <p className="text-xs text-muted-foreground">Dia atual: {getWeekdayLabel(todayWeekday)}</p>
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Planos de treino ativos e inativos.</p>
            <Button
              variant={isPlanFormOpen ? "outline" : "default"}
              size="sm"
              onClick={() => {
                setEditingPlan(undefined)
                setIsPlanFormOpen((prev) => !prev)
              }}
            >
              <Plus className="mr-1 size-4" />
              {isPlanFormOpen ? "Fechar formulario" : "Novo plano"}
            </Button>
          </div>

          {isPlanFormOpen || editingPlan ? (
            <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
              <WorkoutPlanForm
                initialPlan={editingPlan}
                isSubmitting={isSubmittingPlan}
                onSubmit={async (values: WorkoutPlanFormValues) => {
                  setIsSubmittingPlan(true)

                  try {
                    if (editingPlan) {
                      await editPlan(editingPlan.id, values)
                      setEditingPlan(undefined)
                    } else {
                      await createPlan(values)
                    }
                    setIsPlanFormOpen(false)
                  } finally {
                    setIsSubmittingPlan(false)
                  }
                }}
                onCancel={() => {
                  setEditingPlan(undefined)
                  setIsPlanFormOpen(false)
                }}
              />
            </section>
          ) : null}

          <WorkoutPlanList
            plans={plans}
            onEdit={(plan) => {
              setEditingPlan(plan)
              setIsPlanFormOpen(true)
            }}
            onDelete={(planId) => void removePlan(planId)}
          />
        </TabsContent>

        <TabsContent value="workouts" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Cadastre treinos por dia da semana e por plano.</p>
            <Button
              variant={isWorkoutFormOpen ? "outline" : "default"}
              size="sm"
              onClick={() => {
                setEditingWorkout(undefined)
                setIsWorkoutFormOpen((prev) => !prev)
              }}
            >
              <Plus className="mr-1 size-4" />
              {isWorkoutFormOpen ? "Fechar formulario" : "Novo treino"}
            </Button>
          </div>

          {isWorkoutFormOpen || editingWorkout ? (
            <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
              <WorkoutForm
                plans={plans}
                initialWorkout={editingWorkout}
                isSubmitting={isSubmittingWorkout}
                onSubmit={async (values, exercises) => {
                  setIsSubmittingWorkout(true)

                  try {
                    if (editingWorkout) {
                      await editWorkoutEntry(editingWorkout.id, {
                        planId: values.planId,
                        name: values.name,
                        muscleGroup: values.muscleGroup,
                        weekday: values.weekday,
                        order: values.order,
                        exercises,
                      })
                      setEditingWorkout(undefined)
                    } else {
                      await createWorkoutEntry({
                        planId: values.planId,
                        name: values.name,
                        muscleGroup: values.muscleGroup,
                        weekday: values.weekday,
                        order: values.order,
                        exercises,
                      })
                    }
                    setIsWorkoutFormOpen(false)
                  } finally {
                    setIsSubmittingWorkout(false)
                  }
                }}
                onCancel={() => {
                  setEditingWorkout(undefined)
                  setIsWorkoutFormOpen(false)
                }}
              />
            </section>
          ) : null}

          <div className="grid gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : workouts.length === 0 ? (
              <Card className="border-border/70">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground">Nenhum treino cadastrado.</p>
                </CardContent>
              </Card>
            ) : (
              workouts.map((workout) => {
                const plan = plans.find((item) => item.id === workout.planId)

                return (
                  <Card key={workout.id} className="border-border/70">
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{workout.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Plano: {workoutPlanLookup[workout.planId] ?? "Sem plano"}
                          </p>
                        </div>
                        <Badge variant="secondary">{workout.muscleGroup}</Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Dia: {typeof workout.weekday === "number" ? getWeekdayLabel(workout.weekday) : "Nao definido"}
                      </p>
                      {plan ? (
                        <p className="text-xs text-muted-foreground">Status do plano: {getWorkoutPlanStatusLabel(plan.status)}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">Exercicios planejados: {workout.exercises.length}</p>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingWorkout(workout)
                            setIsWorkoutFormOpen(true)
                          }}
                        >
                          <PencilSimpleLine className="mr-1 size-4" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void removeWorkoutEntry(workout.id)}>
                          <Trash className="mr-1 size-4" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Toque em um registro para abrir os detalhes da execucao.</p>
            <WorkoutHistoryList
              executions={executions}
              workoutNameById={workoutNameById}
              planNameById={workoutPlanLookup}
              workoutsById={workoutsById}
              plansById={plansById}
              userName={userName}
              onDelete={(executionId) => void removeExecutionEntry(executionId)}
              initialOpenedExecutionId={executionIdParam ?? undefined}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Atividades registradas (manual e Strava).</p>

            {editingActivityHistory ? (
              <Card className="border-border/70">
                <CardContent className="pt-5">
                  <ActivityForm
                    initialActivity={editingActivityHistory}
                    isSubmitting={isSubmittingActivityHistory}
                    onSubmit={submitActivityFromHistory}
                    onCancel={() => setEditingActivityHistory(undefined)}
                  />
                </CardContent>
              </Card>
            ) : null}

            <ActivityHistoryList
              activities={activities}
              onEdit={setEditingActivityHistory}
              onDelete={(activityId) => void deleteActivityEntry(activityId)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <WorkoutExecutionSheet
        open={isExecutionSheetOpen}
        onOpenChange={setIsExecutionSheetOpen}
        title={hasExecutionToday ? "Treinar novamente" : "Iniciar treino"}
        subtitle={todayWorkout?.name ?? "Selecione o treino"}
      >
        <WorkoutExecutionForm
          plans={plans}
          workouts={workouts}
          immersive
          initialPlanId={executionInitialPlanId}
          initialWorkoutId={executionInitialWorkoutId}
          hasExecutionToday={hasExecutionToday}
          isSubmitting={isSubmittingExecution}
          onSubmit={async (payload) => {
            setIsSubmittingExecution(true)
            try {
              await createExecutionEntry(payload)
              if (plannedEventId) {
                await markPlanningEventCompleted(plannedEventId)
              }
            } finally {
              setIsSubmittingExecution(false)
            }
          }}
          onExecutionCompleted={() => {
            setActiveTab("history")
            setIsExecutionSheetOpen(false)
          }}
        />
      </WorkoutExecutionSheet>
    </div>
  )
}
