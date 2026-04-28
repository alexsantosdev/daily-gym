import type { MealType } from "@/types/meal"
import type { GroupActivityType } from "@/types/group"
import type { StreakStatus } from "@/types/streak"
import type {
  CheckinType,
  WorkoutExecutionStatus,
  WorkoutPlanGoal,
  WorkoutPlanStatus,
} from "@/types/workout"

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Cafe da manha",
  lunch: "Almoco",
  dinner: "Jantar",
  snack: "Lanche",
  pre_workout: "Pre-treino",
  post_workout: "Pos-treino",
  other: "Outro",
}

const workoutExecutionStatusLabels: Record<WorkoutExecutionStatus, string> = {
  planned: "Planejado",
  in_progress: "Em andamento",
  executed: "Executado",
  partial: "Parcial",
  not_executed: "Nao executado",
}

const checkinTypeLabels: Record<CheckinType, string> = {
  auto: "Automatico",
  manual: "Manual",
}

const workoutPlanGoalLabels: Record<WorkoutPlanGoal, string> = {
  hypertrophy: "Hipertrofia",
  weight_loss: "Emagrecimento",
  strength: "Forca",
  maintenance: "Manutencao",
  conditioning: "Condicionamento",
  other: "Outro",
}

const workoutPlanStatusLabels: Record<WorkoutPlanStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
}

const streakStatusLabels: Record<StreakStatus, string> = {
  completed: "Cumprido",
  missed: "Perdido",
  rest_day: "Descanso",
  pending: "Pendente",
}

const groupActivityTypeLabels: Record<GroupActivityType, string> = {
  workout_completed: "Treino concluido",
  workout_photo: "Foto de treino",
  activity_completed: "Atividade concluida",
  activity_photo: "Foto de atividade",
  workout_checkin: "Check-in de treino",
  meal_photo: "Refeicao com foto",
  manual: "Manual",
}

export function getMealTypeLabel(type: MealType): string {
  return mealTypeLabels[type]
}

export function getWorkoutExecutionStatusLabel(status: WorkoutExecutionStatus): string {
  return workoutExecutionStatusLabels[status]
}

export function getCheckinTypeLabel(type: CheckinType): string {
  return checkinTypeLabels[type]
}

export function getWorkoutPlanGoalLabel(goal: WorkoutPlanGoal): string {
  return workoutPlanGoalLabels[goal]
}

export function getWorkoutPlanStatusLabel(status: WorkoutPlanStatus): string {
  return workoutPlanStatusLabels[status]
}

export function getStreakStatusLabel(status: StreakStatus): string {
  return streakStatusLabels[status]
}

export function getGroupActivityTypeLabel(type: GroupActivityType): string {
  return groupActivityTypeLabels[type]
}
