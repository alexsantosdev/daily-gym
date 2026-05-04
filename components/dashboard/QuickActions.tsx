import Link from "next/link"

import { Barbell, ChartBar, Drop, ForkKnife, ListChecks, PersonSimpleWalk } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

const iconByAction = {
  meal: ForkKnife,
  workout: Barbell,
  activity: PersonSimpleWalk,
  water: Drop,
  plans: ListChecks,
  reports: ChartBar,
} as const

export function QuickActions() {
  const actions = [
    { id: "meal", href: "/meals?quick=1", label: "Nova refeicao" },
    { id: "workout", href: "/workouts?start=1", label: "Iniciar treino" },
    { id: "activity", href: "/activities?quick=1", label: "Nova atividade" },
    { id: "water", href: "/water", label: "Registrar agua" },
    { id: "plans", href: "/workouts?tab=plans", label: "Gerenciar planos" },
    { id: "reports", href: "/reports", label: "Ver relatorios" },
  ] as const

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const Icon = iconByAction[action.id]

        return (
          <Button key={action.id} asChild className="h-12 justify-start rounded-xl">
            <Link href={action.href}>
              <Icon className="mr-2 size-4" />
              {action.label}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
