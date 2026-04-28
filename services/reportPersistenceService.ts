import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore"

import { assertFirebaseConfigured } from "@/lib/firebase"
import type { PersistedReport, SaveReportInput } from "@/types/report"

const COLLECTION_NAME = "reports"

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined)
      .map(([key, itemValue]) => [key, stripUndefinedDeep(itemValue)])
    return Object.fromEntries(entries) as T
  }

  return value
}

function mapPersistedReport(id: string, data: Partial<PersistedReport>): PersistedReport {
  return {
    id,
    userId: data.userId ?? "",
    type: data.type ?? "general",
    periodStart: data.periodStart ?? "",
    periodEnd: data.periodEnd ?? "",
    generatedSummary: data.generatedSummary ?? "",
    reportData: data.reportData as PersistedReport["reportData"],
    filters: data.filters as PersistedReport["filters"],
    gptAnalysis: data.gptAnalysis,
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

export async function saveReport(input: SaveReportInput) {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()

  const payload: Omit<PersistedReport, "id"> = {
    userId: input.userId,
    type: input.type,
    periodStart: input.filters.periodStart,
    periodEnd: input.filters.periodEnd,
    generatedSummary: input.reportData.summaryText,
    reportData: input.reportData,
    filters: input.filters,
    gptAnalysis: input.gptAnalysis,
    createdAt: now,
  }

  const sanitizedPayload = stripUndefinedDeep(payload)
  const created = await addDoc(collection(db, COLLECTION_NAME), sanitizedPayload)
  return mapPersistedReport(created.id, sanitizedPayload)
}

export async function listSavedReports(userId: string) {
  const { db } = assertFirebaseConfigured()
  const reportsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(reportsQuery)
  return snapshot.docs.map((item) => mapPersistedReport(item.id, item.data() as Partial<PersistedReport>))
}

export async function getSavedReport(reportId: string) {
  const { db } = assertFirebaseConfigured()
  const report = await getDoc(doc(db, COLLECTION_NAME, reportId))

  if (!report.exists()) {
    return null
  }

  return mapPersistedReport(report.id, report.data() as Partial<PersistedReport>)
}

export async function deleteSavedReport(reportId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, reportId))
}
