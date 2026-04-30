import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parseIsoDateLocal, todayIsoDate } from "@/lib/date"
import { getMealTypeLabel } from "@/lib/labels"
import type { Meal } from "@/types/meal"

export function MealStats({ meals }: { meals: Meal[] }) {
  const today = todayIsoDate()
  const weekStart = parseIsoDateLocal(today)
  weekStart.setDate(weekStart.getDate() - 6)

  const mealsToday = meals.filter((meal) => meal.date === today)
  const mealsWeek = meals.filter((meal) => parseIsoDateLocal(meal.date).getTime() >= weekStart.getTime())

  const lastMeal = meals[0]

  const typeFrequency = meals.reduce<Record<string, number>>((acc, meal) => {
    const key = meal.mealType
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const topType = Object.entries(typeFrequency).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Refeicoes hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold sm:text-2xl">{mealsToday.length}</p>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Refeicoes na semana</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold sm:text-2xl">{mealsWeek.length}</p>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Tipo mais frequente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium leading-tight">{topType ? getMealTypeLabel(topType[0] as Meal["mealType"]) : "-"}</p>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Ultima refeicao</CardTitle>
        </CardHeader>
        <CardContent>
          {lastMeal ? (
            <p className="text-sm font-medium">{lastMeal.date} {lastMeal.time}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Sem registros</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

