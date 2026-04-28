import { toBlob } from "html-to-image"

import { formatDatePtBr, todayIsoDate } from "@/lib/date"
import type { ShareCardData, ShareCardType } from "@/types/share"
import type { StreakSummary } from "@/types/streak"
import type { WorkoutExecution } from "@/types/workout"

export function getShareTitle(type: ShareCardType): string {
  if (type === "workout") {
    return "Treino compartilhado"
  }

  if (type === "activity") {
    return "Atividade compartilhada"
  }

  if (type === "streak") {
    return "Ofensiva compartilhada"
  }

  if (type === "competition") {
    return "Competicao compartilhada"
  }

  return "Recap mensal compartilhado"
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function getShareFileName(type: ShareCardType, date = todayIsoDate()) {
  const base = `${type}-${date}`
  return `${sanitizeFileName(base)}.png`
}

export async function generateShareImage(element: HTMLElement): Promise<Blob> {
  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 3,
    backgroundColor: "transparent",
  })

  if (!blob) {
    throw new Error("Nao foi possivel gerar a imagem de compartilhamento.")
  }

  return blob
}

export function downloadShareImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function shareImage(blob: Blob, title: string, filename: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false
  }

  const file = new File([blob], filename, { type: "image/png" })
  const payload: ShareData = {
    title,
    text: title,
    files: [file],
  }

  if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
    return false
  }

  await navigator.share(payload)
  return true
}

export function buildWorkoutShareData(input: {
  userName: string
  workoutName: string
  planName?: string
  execution: WorkoutExecution
  exercisesTotal: number
  highlightLoad?: string
}): ShareCardData {
  return {
    type: "workout",
    title: "TREINO CONCLUIDO",
    subtitle: `${input.workoutName}${input.planName ? ` • ${input.planName}` : ""}`,
    userName: input.userName,
    date: formatDatePtBr(input.execution.date),
    photoUrl: input.execution.photoUrl,
    badge: "Workout",
    highlight: "Treino concluido no daily-gym",
    metrics: [
      { label: "Duracao", value: input.execution.durationMinutes ?? 0, suffix: "min", highlight: true },
      { label: "Exercicios", value: input.exercisesTotal },
      ...(input.highlightLoad ? [{ label: "Carga destaque", value: input.highlightLoad }] : []),
    ],
    footer: "daily-gym",
  }
}

export function buildStreakShareData(input: {
  userName: string
  summary: StreakSummary
}): ShareCardData {
  return {
    type: "streak",
    title: "OFENSIVA EM ALTA",
    subtitle: "Consistencia nos dias planejados",
    userName: input.userName,
    date: formatDatePtBr(todayIsoDate()),
    badge: "Streak",
    highlight: "Mantenha o ritmo e siga evoluindo.",
    metrics: [
      { label: "Ofensiva atual", value: input.summary.currentStreak, suffix: "dias", highlight: true },
      { label: "Melhor ofensiva", value: input.summary.longestStreak, suffix: "dias" },
      { label: "Progresso semanal", value: input.summary.weeklyPercentage, suffix: "%" },
    ],
    footer: "daily-gym",
  }
}

export function buildCompetitionShareData(input: {
  userName: string
  groupName: string
  rank: number
  points: number
  rivalName?: string
  rivalPoints?: number
  pointsDiff?: number
  highlight?: string
  rivalPhotoUrl?: string
}): ShareCardData {
  return {
    type: "competition",
    title: "MODO COMPETICAO",
    subtitle: input.groupName,
    userName: input.userName,
    date: formatDatePtBr(todayIsoDate()),
    badge: "Competicao",
    photoUrl: input.rivalPhotoUrl,
    highlight:
      input.highlight ??
      (input.rank === 1
        ? "Voce esta na lideranca."
        : `Faltam ${Math.max(0, input.pointsDiff ?? 0)} pts para encostar em ${input.rivalName ?? "seu rival"}.`),
    metrics: [
      { label: "Posicao", value: `#${input.rank}`, highlight: true },
      { label: "Seus pontos", value: input.points, suffix: "pts" },
      ...(input.rivalName
        ? [{ label: `Rival (${input.rivalName})`, value: input.rivalPoints ?? 0, suffix: "pts" }]
        : []),
      ...(typeof input.pointsDiff === "number" ? [{ label: "Diferenca", value: input.pointsDiff, suffix: "pts" }] : []),
    ],
    footer: "daily-gym",
  }
}

export function buildActivityShareData(input: {
  userName: string
  name: string
  durationMinutes?: number
  date: string
  photoUrl?: string
}): ShareCardData {
  return {
    type: "activity",
    title: "ATIVIDADE REGISTRADA",
    subtitle: input.name,
    userName: input.userName,
    date: formatDatePtBr(input.date),
    photoUrl: input.photoUrl,
    badge: "Activity",
    highlight: "Atividade registrada no daily-gym",
    metrics: [{ label: "Duracao", value: input.durationMinutes ?? 0, suffix: "min", highlight: true }],
    footer: "daily-gym",
  }
}

export function buildMonthlyRecapShareData(input: {
  userName: string
  monthLabel: string
  workouts: number
  activities: number
  meals: number
  bestStreak: number
  photos: number
  competitionRank?: number
}): ShareCardData {
  return {
    type: "monthly_recap",
    title: "RECAP MENSAL",
    subtitle: input.monthLabel,
    userName: input.userName,
    date: formatDatePtBr(todayIsoDate()),
    badge: "Recap",
    highlight: "Seu resumo do mes no daily-gym",
    metrics: [
      { label: "Treinos", value: input.workouts, highlight: true },
      { label: "Atividades", value: input.activities },
      { label: "Refeicoes", value: input.meals },
      { label: "Melhor ofensiva", value: input.bestStreak, suffix: "dias" },
      { label: "Fotos", value: input.photos },
      ...(typeof input.competitionRank === "number" ? [{ label: "Rank competicao", value: `#${input.competitionRank}` }] : []),
    ],
    footer: "daily-gym",
  }
}
