"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  createWorkout,
  deleteWorkout,
  listWorkoutsByUser,
  updateWorkout,
} from "@/services/workoutService"
import {
  createWorkoutExecution,
  deleteWorkoutExecution,
  listWorkoutExecutionsByUser,
  updateWorkoutExecution,
} from "@/services/workoutExecutionService"
import { syncWorkoutExecutionToGroups } from "@/services/groupActivityService"
import {
  createWorkoutPlan,
  deleteWorkoutPlan,
  listWorkoutPlansByUser,
  updateWorkoutPlan,
} from "@/services/workoutPlanService"
import type {
  CreateWorkoutExecutionInput,
  CreateWorkoutInput,
  CreateWorkoutPlanInput,
  UpdateWorkoutExecutionInput,
  UpdateWorkoutInput,
  UpdateWorkoutPlanInput,
  Workout,
  WorkoutExecution,
  WorkoutPlan,
} from "@/types/workout"

interface WorkoutUserProfile {
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
}

export function useWorkouts(userId?: string, userProfile?: WorkoutUserProfile) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [executions, setExecutions] = useState<WorkoutExecution[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) {
      setPlans([])
      setWorkouts([])
      setExecutions([])
      return
    }

    setIsLoading(true)

    try {
      const [nextPlans, nextWorkouts, nextExecutions] = await Promise.all([
        listWorkoutPlansByUser(userId),
        listWorkoutsByUser(userId),
        listWorkoutExecutionsByUser(userId),
      ])

      setPlans(nextPlans)
      setWorkouts(nextWorkouts)
      setExecutions(nextExecutions)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createPlan = useCallback(
    async (input: Omit<CreateWorkoutPlanInput, "userId">) => {
      if (!userId) {
        return
      }

      await createWorkoutPlan({ ...input, userId })
      await refresh()
    },
    [refresh, userId]
  )

  const editPlan = useCallback(
    async (planId: string, input: UpdateWorkoutPlanInput) => {
      if (!userId) {
        return
      }

      await updateWorkoutPlan(planId, userId, input)
      await refresh()
    },
    [refresh, userId]
  )

  const removePlan = useCallback(
    async (planId: string) => {
      await deleteWorkoutPlan(planId)
      await refresh()
    },
    [refresh]
  )

  const createWorkoutEntry = useCallback(
    async (input: Omit<CreateWorkoutInput, "userId">) => {
      if (!userId) {
        return
      }

      await createWorkout({ ...input, userId })
      await refresh()
    },
    [refresh, userId]
  )

  const editWorkoutEntry = useCallback(
    async (workoutId: string, input: UpdateWorkoutInput) => {
      if (!userId) {
        return
      }

      await updateWorkout(workoutId, userId, input)
      await refresh()
    },
    [refresh, userId]
  )

  const removeWorkoutEntry = useCallback(
    async (workoutId: string) => {
      await deleteWorkout(workoutId)
      await refresh()
    },
    [refresh]
  )

  const createExecutionEntry = useCallback(
    async (input: Omit<CreateWorkoutExecutionInput, "userId">) => {
      if (!userId) {
        return
      }

      const createdExecution = await createWorkoutExecution({ ...input, userId })

      const executionWorkout = workouts.find((workout) => workout.id === createdExecution.workoutId) ?? null
      const executionPlan = plans.find((plan) => plan.id === createdExecution.planId) ?? null

      await syncWorkoutExecutionToGroups({
        userId,
        userName: userProfile?.displayName || userProfile?.email,
        userPhotoURL: userProfile?.photoURL,
        execution: createdExecution,
        plan: executionPlan,
        workout: executionWorkout,
      })

      await refresh()
    },
    [
      plans,
      refresh,
      userId,
      userProfile?.displayName,
      userProfile?.email,
      userProfile?.photoURL,
      workouts,
    ]
  )

  const editExecutionEntry = useCallback(
    async (executionId: string, input: UpdateWorkoutExecutionInput) => {
      if (!userId) {
        return
      }

      await updateWorkoutExecution(executionId, userId, input)
      await refresh()
    },
    [refresh, userId]
  )

  const removeExecutionEntry = useCallback(
    async (executionId: string) => {
      await deleteWorkoutExecution(executionId)
      await refresh()
    },
    [refresh]
  )

  return useMemo(
    () => ({
      plans,
      workouts,
      executions,
      isLoading,
      refresh,
      createPlan,
      editPlan,
      removePlan,
      createWorkoutEntry,
      editWorkoutEntry,
      removeWorkoutEntry,
      createExecutionEntry,
      editExecutionEntry,
      removeExecutionEntry,
    }),
    [
      plans,
      workouts,
      executions,
      isLoading,
      refresh,
      createPlan,
      editPlan,
      removePlan,
      createWorkoutEntry,
      editWorkoutEntry,
      removeWorkoutEntry,
      createExecutionEntry,
      editExecutionEntry,
      removeExecutionEntry,
    ]
  )
}
