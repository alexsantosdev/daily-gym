"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  createActivity,
  deleteActivity,
  getActivitiesByUser,
  updateActivity,
} from "@/services/activityService"
import { syncActivityToGroups } from "@/services/groupActivityService"
import type { Activity, CreateActivityInput, UpdateActivityInput } from "@/types/activity"

interface ActivityUserProfile {
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
}

export function useActivities(userId?: string, userProfile?: ActivityUserProfile) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) {
      setActivities([])
      return
    }

    setIsLoading(true)
    try {
      const records = await getActivitiesByUser(userId)
      setActivities(records)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createActivityEntry = useCallback(
    async (input: Omit<CreateActivityInput, "userId">) => {
      if (!userId) {
        return
      }

      const createdActivity = await createActivity({ ...input, userId })
      await syncActivityToGroups({
        userId,
        userName: userProfile?.displayName || userProfile?.email,
        userPhotoURL: userProfile?.photoURL,
        activity: createdActivity,
      })
      await refresh()
    },
    [refresh, userId, userProfile?.displayName, userProfile?.email, userProfile?.photoURL]
  )

  const updateActivityEntry = useCallback(
    async (activityId: string, input: UpdateActivityInput) => {
      if (!userId) {
        return
      }

      await updateActivity(activityId, userId, input)
      await refresh()
    },
    [refresh, userId]
  )

  const deleteActivityEntry = useCallback(
    async (activityId: string) => {
      await deleteActivity(activityId)
      await refresh()
    },
    [refresh]
  )

  return useMemo(
    () => ({
      activities,
      isLoading,
      refresh,
      createActivityEntry,
      updateActivityEntry,
      deleteActivityEntry,
    }),
    [activities, createActivityEntry, deleteActivityEntry, isLoading, refresh, updateActivityEntry]
  )
}
