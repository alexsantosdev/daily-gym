"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { PencilSimpleLine, Plus, Trash } from "@phosphor-icons/react"

import { ActivityForm, type ActivityFormValues } from "@/components/activities/ActivityForm"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useActivities } from "@/hooks/useActivities"
import { useAuth } from "@/hooks/useAuth"
import { uploadActivityPhoto } from "@/services/activityService"
import { markPlanningEventCompleted } from "@/services/planningService"
import type { Activity } from "@/types/activity"

const activityTypeLabel: Record<string, string> = {
  walk: "Caminhada",
  dance: "Danca/Zumba",
  cardio: "Cardio/Corrida",
  custom: "Personalizada",
}

export default function ActivitiesPage() {
  const searchParams = useSearchParams()
  const quick = searchParams.get("quick") === "1"
  const plannedEventId = searchParams.get("plannedEventId")
  const { user } = useAuth()
  const {
    activities,
    isLoading,
    createActivityEntry,
    updateActivityEntry,
    deleteActivityEntry,
  } = useActivities(user?.uid, {
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
  })

  const [editingActivity, setEditingActivity] = useState<Activity | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(quick)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (quick) {
      setIsFormOpen(true)
    }
  }, [quick])

  useEffect(() => {
    if (editingActivity) {
      setIsFormOpen(true)
    }
  }, [editingActivity])

  const recentActivities = useMemo(() => activities.slice(0, 10), [activities])

  async function submitActivity(values: ActivityFormValues) {
    if (!user?.uid) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const photoUrl = values.photoFile ? await uploadActivityPhoto(user.uid, values.photoFile) : undefined
      const payload = {
        name: values.name,
        type: values.type,
        date: values.date,
        durationMinutes: values.durationMinutes,
        notes: values.notes || undefined,
        photoUrl: photoUrl ?? editingActivity?.photoUrl,
      }

      if (editingActivity) {
        await updateActivityEntry(editingActivity.id, payload)
        setEditingActivity(undefined)
      } else {
        await createActivityEntry(payload)
        if (plannedEventId) {
          await markPlanningEventCompleted(plannedEventId)
        }
      }
      setIsFormOpen(false)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Falha ao registrar atividade.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Atividades"
        description="Registre caminhada, corrida, danca e outras atividades fisicas de forma rapida."
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{editingActivity ? "Editar atividade" : "Registro rapido"}</span>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setIsFormOpen((prev) => !prev)}>
              <Plus className="mr-1 size-4" />
              {isFormOpen ? "Fechar" : "Registrar atividade"}
            </Button>
          </CardTitle>
        </CardHeader>
        {isFormOpen ? (
          <CardContent>
            <ActivityForm
              initialActivity={editingActivity}
              isSubmitting={isSubmitting}
              onSubmit={submitActivity}
              onCancel={() => {
                setEditingActivity(undefined)
                setIsFormOpen(false)
              }}
            />
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </CardContent>
        ) : null}
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Atividades recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atividades registradas ainda.</p>
          ) : (
            recentActivities.map((activity: Activity) => (
              <div key={activity.id} className="rounded-xl border border-border/70 p-3">
                {activity.photoUrl ? (
                  <Image
                    src={activity.photoUrl}
                    alt={activity.name}
                    width={960}
                    height={320}
                    unoptimized
                    className="mb-2 h-28 w-full rounded-lg object-cover"
                  />
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{activity.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.date} • {activity.durationMinutes ?? 0} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{activityTypeLabel[activity.type] ?? "Atividade"}</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setEditingActivity(activity)}
                    >
                      <PencilSimpleLine className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => {
                        void deleteActivityEntry(activity.id)
                        if (editingActivity?.id === activity.id) {
                          setEditingActivity(undefined)
                        }
                      }}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
