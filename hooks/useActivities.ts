"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  createActivity,
  deleteActivity,
  getActivityBySourceExternalId,
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

interface ImportProgressPayload {
  processed: number
  total: number
  created: number
  skipped: number
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

  const createImportedStravaActivities = useCallback(
    async (
      items: Array<Omit<CreateActivityInput, "userId">>,
      options?: {
        onProgress?: (payload: ImportProgressPayload) => void
      }
    ) => {
      if (!userId || items.length === 0) {
        return { created: 0, skipped: 0 }
      }

      let created = 0
      let skipped = 0
      let processed = 0
      const total = items.length

      options?.onProgress?.({ processed, total, created, skipped })

      for (const item of items) {
        const externalSourceId = item.externalSourceId
        if (item.source === "strava" && externalSourceId) {
          const existing = await getActivityBySourceExternalId(userId, "strava", externalSourceId)
          if (existing) {
            skipped += 1
            processed += 1
            options?.onProgress?.({ processed, total, created, skipped })
            continue
          }
        }

        const createdActivity = await createActivity({ ...item, userId })
        await syncActivityToGroups({
          userId,
          userName: userProfile?.displayName || userProfile?.email,
          userPhotoURL: userProfile?.photoURL,
          activity: createdActivity,
        })
        created += 1
        processed += 1
        options?.onProgress?.({ processed, total, created, skipped })
      }

      await refresh()
      return { created, skipped }
    },
    [refresh, userId, userProfile?.displayName, userProfile?.email, userProfile?.photoURL]
  )

  return useMemo(
    () => ({
      activities,
      isLoading,
      refresh,
      createActivityEntry,
      createImportedStravaActivities,
      updateActivityEntry,
      deleteActivityEntry,
    }),
    [
      activities,
      createActivityEntry,
      createImportedStravaActivities,
      deleteActivityEntry,
      isLoading,
      refresh,
      updateActivityEntry,
    ]
  )
}
