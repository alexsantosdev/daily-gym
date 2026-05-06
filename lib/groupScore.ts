import type { GroupActivity, GroupMember, GroupActivityType } from "@/types/group"
import { parseIsoDateLocal } from "@/lib/date"

export const GROUP_POINTS: Record<GroupActivityType, number> = {
  workout_completed: 100,
  workout_photo: 30,
  activity_completed: 100,
  activity_photo: 30,
  workout_checkin: 10,
  meal_photo: 5,
  manual: 0,
}

export interface GroupMemberScore {
  memberId: string
  name: string
  photoURL?: string | null
  totalPoints: number
  workoutsCompleted: number
  activitiesCompleted: number
  workoutPhotos: number
  activityPhotos: number
  checkins: number
  mealPhotos: number
  currentStreak: number
  weeklyCompletionRate: number
  rank: number
}

export function getPointsByActivityType(type: GroupActivityType): number {
  return GROUP_POINTS[type] ?? 0
}

function computeCurrentStreakByActivities(activities: GroupActivity[]): number {
  const dates = Array.from(
    new Set(
      activities
        .filter((activity) => activity.type === "workout_completed")
        .map((activity) => activity.date)
    )
  ).sort()

  if (dates.length === 0) {
    return 0
  }

  let streak = 1

  for (let index = dates.length - 1; index > 0; index -= 1) {
    const current = parseIsoDateLocal(dates[index]).getTime()
    const previous = parseIsoDateLocal(dates[index - 1]).getTime()
    const daysDiff = Math.round((current - previous) / 86400000)

    if (daysDiff <= 1) {
      streak += 1
      continue
    }

    break
  }

  return streak
}

export function calculateGroupScore(
  activities: GroupActivity[],
  members: GroupMember[]
): GroupMemberScore[] {
  const memberMap = new Map(
    members
      .filter((member) => member.status === "active")
      .map((member) => [member.userId, member])
  )

  const groupedActivities = new Map<string, GroupActivity[]>()

  activities.forEach((activity) => {
    if (!memberMap.has(activity.userId)) {
      return
    }

    const current = groupedActivities.get(activity.userId) ?? []
    current.push(activity)
    groupedActivities.set(activity.userId, current)
  })

  const rows = Array.from(memberMap.values()).map((member) => {
    const memberActivities = groupedActivities.get(member.userId) ?? []
    const workoutsCompleted = memberActivities.filter(
      (activity) => activity.type === "workout_completed"
    ).length
    const activitiesCompleted = memberActivities.filter(
      (activity) => activity.type === "activity_completed"
    ).length
    const workoutPhotos = memberActivities.filter((activity) => activity.type === "workout_photo").length
    const activityPhotos = memberActivities.filter((activity) => activity.type === "activity_photo").length
    const checkins = memberActivities.filter((activity) => activity.type === "workout_checkin").length
    const mealPhotos = memberActivities.filter((activity) => activity.type === "meal_photo").length

    const basePoints = memberActivities.reduce((acc, activity) => acc + activity.points, 0)
    const totalPoints = basePoints
    const currentStreak = computeCurrentStreakByActivities(memberActivities)
    const weeklyCompletionRate =
      workoutsCompleted + activitiesCompleted === 0
        ? 0
        : Math.min(100, workoutsCompleted * 20 + activitiesCompleted * 20)

    return {
      memberId: member.userId,
      name: member.displayName || member.email || "Membro",
      photoURL: member.photoURL,
      totalPoints,
      workoutsCompleted,
      activitiesCompleted,
      workoutPhotos,
      activityPhotos,
      checkins,
      mealPhotos,
      currentStreak,
      weeklyCompletionRate,
      rank: 0,
    }
  })

  rows.sort((a, b) => b.totalPoints - a.totalPoints || b.workoutsCompleted - a.workoutsCompleted)

  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }))
}
