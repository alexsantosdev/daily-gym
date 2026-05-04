"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { Barbell, Drop, ForkKnife, PersonSimpleWalk, Plus, X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { todayIsoDate } from "@/lib/date"
import { addWaterLog } from "@/services/waterService"
import { cn } from "@/lib/utils"

export function FloatingActionMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [isWaterSheetOpen, setIsWaterSheetOpen] = useState(false)
  const [waterCustomAmount, setWaterCustomAmount] = useState("300")
  const [isSavingWater, setIsSavingWater] = useState(false)

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

  async function registerWater(amountMl: number) {
    if (!user?.uid) {
      setOpen(false)
      router.push("/water")
      return
    }

    setIsSavingWater(true)

    try {
      await addWaterLog({
        userId: user.uid,
        date: todayIsoDate(),
        amountMl,
        source: "quick_action",
      })
      setIsWaterSheetOpen(false)
      setOpen(false)
    } finally {
      setIsSavingWater(false)
    }
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
            <Button
              variant="outline"
              className="h-11 w-full justify-start whitespace-nowrap text-sm leading-none"
              onClick={() => {
                setOpen(false)
                setIsWaterSheetOpen(true)
              }}
            >
              <Drop className="mr-2 size-4" />
              Registrar agua
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

      {isWaterSheetOpen ? (
        <div className="pointer-events-auto fixed inset-0 z-[95] bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <p className="text-sm font-semibold">Registro rapido de agua</p>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsWaterSheetOpen(false)}>
                <X className="size-4" />
              </Button>
            </header>
            <div className="space-y-3 px-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                <Button className="h-11" disabled={isSavingWater} onClick={() => void registerWater(200)}>
                  +200 ml
                </Button>
                <Button className="h-11" disabled={isSavingWater} onClick={() => void registerWater(300)}>
                  +300 ml
                </Button>
                <Button className="h-11" disabled={isSavingWater} onClick={() => void registerWater(500)}>
                  +500 ml
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  type="number"
                  min={1}
                  step={50}
                  value={waterCustomAmount}
                  onChange={(event) => setWaterCustomAmount(event.target.value)}
                  placeholder="Quantidade personalizada (ml)"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  disabled={isSavingWater}
                  onClick={() => void registerWater(Math.max(1, Number(waterCustomAmount) || 0))}
                >
                  Registrar personalizado
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
