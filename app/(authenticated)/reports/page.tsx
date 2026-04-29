"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { FunnelSimple, X } from "@phosphor-icons/react"

import { PageHeader } from "@/components/layout/page-header"
import { ChartCard } from "@/components/reports/ChartCard"
import { ConsistencyScore } from "@/components/reports/ConsistencyScore"
import { ReportFilters } from "@/components/reports/ReportFilters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDateRangeFromPreset } from "@/lib/date"
import { useAuth } from "@/hooks/useAuth"
import { useMeals } from "@/hooks/useMeals"
import { useWorkouts } from "@/hooks/useWorkouts"
import { getMealTypeLabel } from "@/lib/labels"
import { deleteSavedReport, listSavedReports, saveReport } from "@/services/reportPersistenceService"
import { generateReportBundle, requestGptInsight } from "@/services/reportService"
import type { GptReportResponse } from "@/types/gpt"
import type { GeneratedReport, PersistedReport, ReportFilters as ReportFiltersType } from "@/types/report"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function createInitialFilters(userId = ""): ReportFiltersType {
  const range = getDateRangeFromPreset("30d")

  return {
    userId,
    periodPreset: "30d",
    periodStart: range.periodStart,
    periodEnd: range.periodEnd,
    type: "general",
  }
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { meals, isLoading: mealsLoading } = useMeals(user?.uid)
  const { plans, workouts, executions, isLoading: workoutsLoading } = useWorkouts(user?.uid)

  const [filters, setFilters] = useState<ReportFiltersType>(() => createInitialFilters())
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [gptAnalysis, setGptAnalysis] = useState<GptReportResponse | null>(null)
  const [savedReports, setSavedReports] = useState<PersistedReport[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSavedReports, setIsLoadingSavedReports] = useState(false)
  const [isGeneratingGpt, setIsGeneratingGpt] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    setFilters((prev) => ({ ...prev, userId: user.uid }))
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setSavedReports([])
      return
    }

    setIsLoadingSavedReports(true)
    void listSavedReports(user.uid)
      .then(setSavedReports)
      .finally(() => setIsLoadingSavedReports(false))
  }, [user?.uid])

  useEffect(() => {
    if (!filters.userId) {
      return
    }

    setIsGenerating(true)
    void generateReportBundle(filters, meals, executions, workouts, plans)
      .then(setReport)
      .finally(() => setIsGenerating(false))
  }, [filters, meals, executions, workouts, plans])

  const isLoadingData = mealsLoading || workoutsLoading || isGenerating

  const generalItems = useMemo(() => {
    if (!report) {
      return []
    }

    return [
      { label: "Dias ativos", value: report.generalStats.activeDays },
      { label: "Total de treinos", value: report.generalStats.totalWorkouts },
      { label: "Total de refeicoes", value: report.generalStats.totalMeals },
      { label: "Media de duracao", value: `${report.generalStats.averageWorkoutDuration} min` },
      { label: "Melhor semana", value: report.generalStats.bestWeek },
    ]
  }, [report])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatorios"
        description="Graficos e indicadores com filtros rapidos para leitura melhor no celular."
      />

      <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <p className="text-sm text-muted-foreground">Escolha periodo e tipo para gerar seus indicadores.</p>
        <Button variant="outline" onClick={() => setIsFiltersOpen(true)}>
          <FunnelSimple className="mr-1 size-4" />
          Filtros
        </Button>
      </section>

      <div className="hidden rounded-2xl border border-border/70 bg-card/60 p-4 md:block">
        <ReportFilters
          value={filters}
          plans={plans}
          workouts={workouts}
          onApply={(nextFilters) => {
            setFilters(nextFilters)
            setGptAnalysis(null)
          }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
          <p className="mb-2 text-sm font-medium">Acoes</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                if (!report || !filters.userId) {
                  return
                }

                setIsGeneratingGpt(true)

                try {
                  const analysis = await requestGptInsight({
                    userGoal: filters.type,
                    periodStart: filters.periodStart,
                    periodEnd: filters.periodEnd,
                    mealsSummary: [
                      `${report.mealStats.mealsCount} refeicoes no periodo`,
                      `${report.mealStats.freeMealDays} dias com refeicao livre`,
                    ],
                    workoutsSummary: [
                      `${report.workoutStats.workoutsExecuted} treinos executados`,
                      `${report.workoutStats.workoutsPlanned} treinos planejados`,
                    ],
                    consistencyMetrics: {
                      score: report.generalStats.consistencyScore,
                      activeDays: report.generalStats.activeDays,
                      mealsCount: report.mealStats.mealsCount,
                      workoutsExecuted: report.workoutStats.workoutsExecuted,
                    },
                    observations: report.summaryText,
                  })

                  setGptAnalysis(analysis)
                } finally {
                  setIsGeneratingGpt(false)
                }
              }}
              disabled={!report || isGeneratingGpt}
            >
              {isGeneratingGpt ? "Gerando analise IA..." : "Gerar analise com IA"}
            </Button>

            <Button
              variant="outline"
              disabled={!report || !filters.userId || isSaving}
              onClick={async () => {
                if (!report || !filters.userId) {
                  return
                }

                setIsSaving(true)

                try {
                  await saveReport({
                    userId: filters.userId,
                    type: filters.type,
                    filters,
                    reportData: report,
                    gptAnalysis: gptAnalysis ?? undefined,
                  })

                  const refreshed = await listSavedReports(filters.userId)
                  setSavedReports(refreshed)
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              {isSaving ? "Salvando..." : "Salvar relatorio"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
          <p className="mb-2 text-sm font-medium">Analise IA</p>
          {gptAnalysis ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={gptAnalysis.source === "openai" ? "default" : "secondary"}>
                  {gptAnalysis.source === "openai" ? "IA real" : "Fallback mock"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(gptAnalysis.generatedAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="text-sm">{gptAnalysis.summary}</p>
              <div className="flex flex-wrap gap-2">
                {gptAnalysis.strengths.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Gere uma analise com IA para este periodo.</p>
          )}
        </section>
      </div>

      <Tabs defaultValue="workouts">
        <TabsList className="grid h-auto grid-cols-1 gap-1 sm:grid-cols-3 sm:h-10">
          <TabsTrigger value="workouts">Treinos</TabsTrigger>
          <TabsTrigger value="meals">Refeicoes</TabsTrigger>
          <TabsTrigger value="general">Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Treinos por semana" description="Frequencia semanal">
              <div className="h-64 sm:h-72">
                {isLoadingData || !report ? (
                  <Skeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.workoutCharts.workoutsByWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="week" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="executed" fill="var(--chart-1)" radius={6} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Planejados vs executados" description="Comparativo semanal">
              <div className="h-64 sm:h-72">
                {isLoadingData || !report ? (
                  <Skeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.workoutCharts.plannedVsExecuted}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="week" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="planned" fill="var(--chart-4)" radius={6} />
                      <Bar dataKey="executed" fill="var(--chart-2)" radius={6} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Duracao media" description="Media de minutos por semana">
              <div className="h-64 sm:h-72">
                {isLoadingData || !report ? (
                  <Skeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.workoutCharts.averageDurationByWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="week" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="averageDuration" fill="var(--chart-3)" radius={6} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Grupo muscular" description="Distribuicao de execucoes">
              <div className="h-64 sm:h-72">
                {isLoadingData || !report ? (
                  <Skeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.workoutCharts.muscleGroupDistribution}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                      >
                        {report.workoutCharts.muscleGroupDistribution.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Evolucao de carga" description="Progressao por exercicio">
            <div className="h-64 sm:h-72">
              {isLoadingData || !report ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.workoutCharts.loadProgressByExercise}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="load" stroke="var(--chart-5)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="meals" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Refeicoes por dia" description="Distribuicao diaria">
              <div className="h-64 sm:h-72">
                {isLoadingData || !report ? (
                  <Skeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.mealCharts.mealsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="meals" fill="var(--chart-2)" radius={6} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Tipos de refeicao" description="Distribuicao por tipo">
              <div className="h-64 sm:h-72">
                {isLoadingData || !report ? (
                  <Skeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.mealCharts.mealTypeDistribution}
                        dataKey="value"
                        nameKey="type"
                        innerRadius={45}
                        outerRadius={100}
                      >
                        {report.mealCharts.mealTypeDistribution.map((entry, index) => (
                          <Cell key={`${entry.type}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Timeline" description="Refeicoes recentes no periodo">
            {isLoadingData || !report ? (
              <Skeleton className="h-32" />
            ) : report.mealCharts.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem refeicoes no periodo filtrado.</p>
            ) : (
              <div className="space-y-2">
                {report.mealCharts.timeline.slice(0, 12).map((item) => (
                  <div key={`${item.date}-${item.time}-${item.description}`} className="rounded-lg border border-border p-2">
                    <p className="text-sm font-medium">
                      {item.date} {item.time} - {getMealTypeLabel(item.mealType)}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
              <p className="text-xs text-muted-foreground">Consistencia alimentar</p>
              <p className="text-2xl font-semibold">{report?.mealStats.mealsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total de refeicoes no periodo</p>
            </section>
            <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
              <p className="text-xs text-muted-foreground">Dias com refeicao livre</p>
              <p className="text-2xl font-semibold">{report?.mealStats.freeMealDays ?? 0}</p>
              <p className="text-xs text-muted-foreground">Dias com tag de refeicao livre</p>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          {report ? (
            <ConsistencyScore
              score={report.generalStats.consistencyScore}
              activeDays={report.generalStats.activeDays}
            />
          ) : (
            <Skeleton className="h-36" />
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {generalItems.map((item) => (
              <section key={item.label} className="rounded-2xl border border-border/70 bg-card/60 p-3">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold">{item.value}</p>
              </section>
            ))}
          </div>

          <section className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <p className="mb-1 text-sm font-medium">Resumo textual</p>
            <p className="text-sm text-muted-foreground">{report?.summaryText ?? "Sem resumo no momento."}</p>
          </section>
        </TabsContent>
      </Tabs>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Relatorios salvos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingSavedReports ? (
            <>
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </>
          ) : savedReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relatorio salvo ainda.</p>
          ) : (
            savedReports.map((saved) => (
              <div key={saved.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{saved.type === "general" ? "Geral" : saved.type === "workouts" ? "Treinos" : "Refeicoes"}</p>
                    <p className="text-xs text-muted-foreground">
                      {saved.periodStart} ate {saved.periodEnd}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFilters(saved.filters)
                        setReport(saved.reportData)
                        setGptAnalysis(saved.gptAnalysis ?? null)
                      }}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await deleteSavedReport(saved.id)
                        if (filters.userId) {
                          const refreshed = await listSavedReports(filters.userId)
                          setSavedReports(refreshed)
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground">{saved.generatedSummary}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isFiltersOpen ? (
        <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm md:hidden">
          <div className="flex h-[100dvh] w-full flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <p className="text-sm font-semibold">Filtros de relatorio</p>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsFiltersOpen(false)}>
                <X className="size-4" />
              </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <ReportFilters
                value={filters}
                plans={plans}
                workouts={workouts}
                onApply={(nextFilters) => {
                  setFilters(nextFilters)
                  setGptAnalysis(null)
                  setIsFiltersOpen(false)
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
