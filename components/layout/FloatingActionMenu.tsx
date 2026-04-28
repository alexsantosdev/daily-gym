"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { Barbell, ForkKnife, PersonSimpleWalk, Plus } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function FloatingActionMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function goToMealsQuick() {
    setOpen(false)
    if (pathname.startsWith("/meals")) {
      router.push("/meals?quick=1")
      return
    }

    router.push("/meals?quick=1")
  }

  function goToWorkoutStart() {
    setOpen(false)
    router.push("/workouts?start=1")
  }

  function goToActivityQuick() {
    setOpen(false)
    router.push("/activities?quick=1")
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 md:hidden">
      <div className="relative">
        <Card
          className={cn(
            "pointer-events-auto absolute bottom-16 right-0 w-[min(16rem,calc(100vw-1.5rem))] origin-bottom-right border-border/70 bg-card/95 shadow-sm backdrop-blur transition-all duration-200",
            open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0"
          )}
        >
          <CardContent className="flex flex-col gap-2 pt-3">
            <Button className="h-11 w-full justify-start whitespace-nowrap text-sm leading-none" onClick={goToMealsQuick}>
              <ForkKnife className="mr-2 size-4" />
              Registrar refeicao
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full justify-start whitespace-nowrap text-sm leading-none"
              onClick={goToWorkoutStart}
            >
              <Barbell className="mr-2 size-4" />
              Iniciar treino
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full justify-start whitespace-nowrap text-sm leading-none"
              onClick={goToActivityQuick}
            >
              <PersonSimpleWalk className="mr-2 size-4" />
              Registrar atividade
            </Button>
          </CardContent>
        </Card>

        <Button
          type="button"
          size="icon-lg"
          className={cn(
            "pointer-events-auto size-14 rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200",
            open && "scale-[1.02]"
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Plus className={cn("size-6 transition-transform duration-200", open && "rotate-45")} />
        </Button>
      </div>
    </div>
  )
}
