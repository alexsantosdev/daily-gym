import type { ActivityType } from "@/types/activity"
import type { StravaSummaryActivity } from "@/types/strava"

export function getStravaSportType(activity: Pick<StravaSummaryActivity, "sport_type" | "type">) {
  return (activity.sport_type ?? activity.type ?? "").toLowerCase()
}

export function isStravaRunOrWalkActivity(activity: Pick<StravaSummaryActivity, "sport_type" | "type" | "name">) {
  const sportType = getStravaSportType(activity)
  const secondaryType = (activity.type ?? "").toLowerCase()
  const normalizedName = (activity.name ?? "").toLowerCase()

  if (
    sportType.includes("run") ||
    secondaryType.includes("run") ||
    sportType.includes("walk") ||
    secondaryType.includes("walk")
  ) {
    return true
  }

  if (sportType === "workout" || secondaryType === "workout") {
    return (
      normalizedName.includes("corrida") ||
      normalizedName.includes("run") ||
      normalizedName.includes("treadmill") ||
      normalizedName.includes("esteira") ||
      normalizedName.includes("jog") ||
      normalizedName.includes("caminhada") ||
      normalizedName.includes("walk")
    )
  }

  return false
}

export function toActivityTypeFromStrava(activity: Pick<StravaSummaryActivity, "sport_type" | "type">): ActivityType {
  const sportType = getStravaSportType(activity)

  if (sportType.includes("walk")) {
    return "walk"
  }

  if (sportType.includes("run") || sportType.includes("jog")) {
    return "cardio"
  }

  return "cardio"
}

export function buildStravaActivityNotes(activity: {
  distance?: number
  total_elevation_gain?: number
  average_speed?: number
  average_heartrate?: number
  calories?: number
}) {
  const parts: string[] = ["Importado automaticamente do Strava"]

  if (typeof activity.distance === "number") {
    parts.push(`Distancia: ${(activity.distance / 1000).toFixed(2)} km`)
  }

  if (typeof activity.total_elevation_gain === "number") {
    parts.push(`Elevacao: ${Math.round(activity.total_elevation_gain)} m`)
  }

  if (typeof activity.average_speed === "number" && activity.average_speed > 0) {
    const paceSeconds = 1000 / activity.average_speed
    const paceMinutes = Math.floor(paceSeconds / 60)
    const paceRemainder = Math.round(paceSeconds % 60)
      .toString()
      .padStart(2, "0")
    parts.push(`Ritmo medio: ${paceMinutes}:${paceRemainder} min/km`)
  }

  if (typeof activity.average_heartrate === "number" && activity.average_heartrate > 0) {
    parts.push(`FC media: ${Math.round(activity.average_heartrate)} bpm`)
  }

  if (typeof activity.calories === "number" && activity.calories > 0) {
    parts.push(`Calorias: ${Math.round(activity.calories)} kcal`)
  }

  return parts.join(" | ")
}

export function getStravaActivityDate(activity: Pick<StravaSummaryActivity, "start_date_local" | "start_date">) {
  const dateValue = activity.start_date_local ?? activity.start_date ?? new Date().toISOString()
  return dateValue.slice(0, 10)
}
