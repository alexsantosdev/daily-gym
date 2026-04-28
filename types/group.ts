export const groupStatuses = ["active", "archived"] as const
export type GroupStatus = (typeof groupStatuses)[number]

export const groupMemberRoles = ["owner", "member"] as const
export type GroupMemberRole = (typeof groupMemberRoles)[number]

export const groupMemberStatuses = ["active", "removed"] as const
export type GroupMemberStatus = (typeof groupMemberStatuses)[number]

export const groupActivityTypes = [
  "workout_completed",
  "workout_photo",
  "activity_completed",
  "activity_photo",
  "workout_checkin",
  "meal_photo",
  "manual",
] as const
export type GroupActivityType = (typeof groupActivityTypes)[number]

export interface Group {
  id: string
  name: string
  ownerId: string
  inviteCode: string
  memberIds: string[]
  createdAt: string
  updatedAt: string
  status: GroupStatus
}

export interface GroupMember {
  userId: string
  displayName: string
  email: string
  photoURL?: string | null
  role: GroupMemberRole
  joinedAt: string
  status: GroupMemberStatus
}

export interface GroupActivity {
  id: string
  groupId: string
  userId: string
  userName: string
  userPhotoURL?: string | null
  type: GroupActivityType
  date: string
  title: string
  description?: string
  photoUrl?: string
  workoutExecutionId?: string
  mealId?: string
  points: number
  createdAt: string
}

export interface CreateGroupInput {
  name: string
  owner: {
    userId: string
    displayName?: string | null
    email?: string | null
    photoURL?: string | null
  }
}

export interface JoinGroupUser {
  userId: string
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
}

export interface CreateGroupActivityInput {
  groupId: string
  userId: string
  userName: string
  userPhotoURL?: string | null
  type: GroupActivityType
  date: string
  title: string
  description?: string
  photoUrl?: string
  workoutExecutionId?: string
  mealId?: string
  points: number
}

export const groupChallengeModes = ["leading", "trailing", "tied", "starting", "cta"] as const
export type GroupChallengeMode = (typeof groupChallengeModes)[number]

export interface GroupChallengeBannerData {
  mode: GroupChallengeMode
  groupId?: string
  groupName?: string
  userRank?: number
  userPoints?: number
  leaderName?: string
  leaderPoints?: number
  rivalName?: string
  rivalPhotoURL?: string | null
  rivalPoints?: number
  pointsDiff?: number
}
