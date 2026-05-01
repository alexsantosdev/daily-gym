export const workoutPlanGoals = [
  "hypertrophy",
  "weight_loss",
  "strength",
  "maintenance",
  "conditioning",
  "other",
] as const

export const workoutPlanStatus = ["active", "inactive"] as const

export const workoutExecutionStatus = [
  "planned",
  "in_progress",
  "executed",
  "partial",
  "not_executed",
] as const

export const checkinType = ["auto", "manual"] as const

export type WorkoutPlanGoal = (typeof workoutPlanGoals)[number]
export type WorkoutPlanStatus = (typeof workoutPlanStatus)[number]
export type WorkoutExecutionStatus = (typeof workoutExecutionStatus)[number]
export type CheckinType = (typeof checkinType)[number]

export interface WorkoutExercise {
  name: string
  muscleGroup: string
  sets: number
  reps: string
  suggestedLoad?: string
  plannedRestSeconds?: number
  notes?: string
}

export interface WorkoutPlan {
  id: string
  userId: string
  name: string
  goal: WorkoutPlanGoal
  description?: string
  weekdays: number[]
  workoutIds: string[]
  status: WorkoutPlanStatus
  createdAt: string
  updatedAt: string
}

export interface CreateWorkoutPlanInput {
  userId: string
  name: string
  goal: WorkoutPlanGoal
  description?: string
  weekdays: number[]
  workoutIds?: string[]
  status?: WorkoutPlanStatus
}

export interface UpdateWorkoutPlanInput {
  name?: string
  goal?: WorkoutPlanGoal
  description?: string
  weekdays?: number[]
  workoutIds?: string[]
  status?: WorkoutPlanStatus
}

export interface Workout {
  id: string
  userId: string
  planId: string
  name: string
  muscleGroup: string
  weekday?: number
  exercises: WorkoutExercise[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface CreateWorkoutInput {
  userId: string
  planId: string
  name: string
  muscleGroup: string
  weekday?: number
  exercises: WorkoutExercise[]
  order?: number
}

export interface UpdateWorkoutInput {
  planId?: string
  name?: string
  muscleGroup?: string
  weekday?: number
  exercises?: WorkoutExercise[]
  order?: number
}

export interface ExecutedExercise {
  exerciseName: string
  setsCompleted: number
  repsCompleted: number
  loadUsed?: string
  notes?: string
  exerciseStartedAt?: string
  exerciseFinishedAt?: string
  completed: boolean
}

export interface WorkoutExecution {
  id: string
  userId: string
  planId: string
  workoutId: string
  date: string
  startedAt?: string
  finishedAt?: string
  durationMinutes?: number
  status: WorkoutExecutionStatus
  checkinType: CheckinType
  checkinAt?: string
  checkoutAt?: string
  photoUrl?: string
  notes?: string
  executedExercises: ExecutedExercise[]
  createdAt: string
  updatedAt: string
}

export interface CreateWorkoutExecutionInput {
  userId: string
  planId: string
  workoutId: string
  date: string
  startedAt?: string
  finishedAt?: string
  status?: WorkoutExecutionStatus
  checkinType?: CheckinType
  checkinAt?: string
  checkoutAt?: string
  photoUrl?: string
  notes?: string
  executedExercises?: ExecutedExercise[]
}

export interface UpdateWorkoutExecutionInput {
  startedAt?: string
  finishedAt?: string
  status?: WorkoutExecutionStatus
  checkinType?: CheckinType
  checkinAt?: string
  checkoutAt?: string
  photoUrl?: string
  notes?: string
  executedExercises?: ExecutedExercise[]
}
