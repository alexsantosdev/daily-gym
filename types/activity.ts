export const activityTypes = ["walk", "dance", "cardio", "custom"] as const
export type ActivityType = (typeof activityTypes)[number]

export type ActivitySource = "manual" | "strava"

export interface Activity {
  id: string
  userId: string
  name: string
  type: ActivityType
  date: string
  durationMinutes?: number
  notes?: string
  photoUrl?: string
  source?: ActivitySource
  externalSourceId?: string
  sourceMetadata?: {
    sportType?: string
    distanceMeters?: number
    movingTimeSeconds?: number
    elapsedTimeSeconds?: number
    elevationGainMeters?: number
    averageSpeedMps?: number
    averageHeartrateBpm?: number
    calories?: number
    startedAt?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateActivityInput {
  userId: string
  name: string
  type: ActivityType
  date: string
  durationMinutes?: number
  notes?: string
  photoUrl?: string
  source?: ActivitySource
  externalSourceId?: string
  sourceMetadata?: Activity["sourceMetadata"]
}

export interface UpdateActivityInput {
  name?: string
  type?: ActivityType
  date?: string
  durationMinutes?: number
  notes?: string
  photoUrl?: string
  source?: ActivitySource
  externalSourceId?: string
  sourceMetadata?: Activity["sourceMetadata"]
}
