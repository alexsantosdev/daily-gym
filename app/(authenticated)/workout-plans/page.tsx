"use client"

import { useState } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { WorkoutPlanForm } from "@/components/workouts/workout-plan-form"
import { WorkoutPlanList } from "@/components/workouts/WorkoutPlanList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { useWorkouts } from "@/hooks/useWorkouts"
import type { WorkoutPlan } from "@/types/workout"

export default function WorkoutPlansPage() {
  const { user } = useAuth()
  const { plans, createPlan, editPlan, removePlan } = useWorkouts(user?.uid)

  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos de treino"
        description="Area de apoio para cadastro de planos (principalmente acessada pela tela de Treinos)."
      />

      <Card>
        <CardHeader>
          <CardTitle>{editingPlan ? "Editar plano" : "Criar plano"}</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutPlanForm
            initialPlan={editingPlan}
            isSubmitting={isSubmitting}
            onSubmit={async (values) => {
              setError(null)
              setIsSubmitting(true)

              try {
                if (editingPlan) {
                  await editPlan(editingPlan.id, values)
                  setEditingPlan(undefined)
                } else {
                  await createPlan(values)
                }
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : "Erro ao salvar plano")
              } finally {
                setIsSubmitting(false)
              }
            }}
            onCancel={editingPlan ? () => setEditingPlan(undefined) : undefined}
          />
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <WorkoutPlanList
        plans={plans}
        onEdit={(plan) => setEditingPlan(plan)}
        onDelete={(planId) => void removePlan(planId)}
      />
    </div>
  )
}
