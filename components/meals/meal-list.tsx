import { MealCard } from "@/components/meals/MealCard"
import { Card, CardContent } from "@/components/ui/card"
import type { Meal } from "@/types/meal"

export function MealList({
  meals,
  onEdit,
  onDelete,
}: {
  meals: Meal[]
  onEdit: (meal: Meal) => void
  onDelete: (mealId: string) => void
}) {
  if (meals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">Nenhuma refeicao encontrada para os filtros.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {meals.map((meal) => (
        <MealCard key={meal.id} meal={meal} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
