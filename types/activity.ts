export const activityTypes = ["walk", "dance", "cardio", "custom"] as const
export type ActivityType = (typeof activityTypes)[number]

export interface Activity {
  id: string
  userId: string
  name: string
  type: ActivityType
  date: string
  durationMinutes?: number
  notes?: string
  photoUrl?: string
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
}

export interface UpdateActivityInput {
  name?: string
  type?: ActivityType
  date?: string
  durationMinutes?: number
  notes?: string
  photoUrl?: string
}
