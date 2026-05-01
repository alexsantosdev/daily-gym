import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { initializeApp } from "firebase/app"
import { collection, getDocs, getFirestore, updateDoc, doc } from "firebase/firestore"

function loadEnvFromFile(filePath) {
  const envContent = readFileSync(filePath, "utf8")
  const lines = envContent.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function normalizeRepsValue(value) {
  if (typeof value === "string") {
    const normalized = value.trim()
    if (normalized && normalized.toLowerCase() !== "nan") {
      return normalized
    }
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return String(value)
    }
  }

  return null
}

function tryInferRange(exercise) {
  const searchable = [exercise?.notes, exercise?.suggestedLoad, exercise?.name]
    .filter((value) => typeof value === "string")
    .join(" ")

  const rangeMatch = searchable.match(/\b(\d{1,2})\s*[-aA]\s*(\d{1,2})\b/)
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]}`
  }

  const singleMatch = searchable.match(/\b(\d{1,2})\s*(reps?|rep)\b/i)
  if (singleMatch) {
    return singleMatch[1]
  }

  return "0"
}

async function main() {
  const repoRoot = process.cwd()
  loadEnvFromFile(resolve(repoRoot, ".env.local"))

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const required = Object.entries(firebaseConfig).filter(([, value]) => !value)
  if (required.length > 0) {
    throw new Error(`Variaveis Firebase ausentes: ${required.map(([key]) => key).join(", ")}`)
  }

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)
  const snapshot = await getDocs(collection(db, "workouts"))

  let docsVisited = 0
  let docsUpdated = 0
  let exercisesUpdated = 0
  let fallbackCount = 0
  const fallbackRows = ["workoutId,exerciseIndex,exerciseName,oldReps,newReps"]

  for (const workoutDoc of snapshot.docs) {
    docsVisited += 1
    const data = workoutDoc.data()
    const exercises = Array.isArray(data.exercises) ? data.exercises : []
    let changed = false

    const nextExercises = exercises.map((exercise, index) => {
      const normalized = normalizeRepsValue(exercise?.reps)
      if (normalized !== null) {
        if (exercise?.reps !== normalized) {
          changed = true
          exercisesUpdated += 1
          return { ...exercise, reps: normalized }
        }
        return exercise
      }

      const inferred = tryInferRange(exercise)
      changed = true
      exercisesUpdated += 1
      fallbackCount += 1
      fallbackRows.push(
        [
          workoutDoc.id,
          index,
          `"${String(exercise?.name ?? "").replaceAll('"', '""')}"`,
          `"${String(exercise?.reps)}"`,
          `"${inferred}"`,
        ].join(",")
      )
      return { ...exercise, reps: inferred }
    })

    if (changed) {
      await updateDoc(doc(db, "workouts", workoutDoc.id), {
        exercises: nextExercises,
        updatedAt: new Date().toISOString(),
      })
      docsUpdated += 1
    }
  }

  const reportPath = resolve(repoRoot, "scripts", "migration-workout-reps-report.csv")
  writeFileSync(reportPath, fallbackRows.join("\n"), "utf8")

  console.log(JSON.stringify({
    docsVisited,
    docsUpdated,
    exercisesUpdated,
    fallbackCount,
    reportPath,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
