import Image from "next/image"
import { PencilSimpleLine, Trash } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getMealTypeLabel } from "@/lib/labels"
import type { Meal } from "@/types/meal"

export function MealCard({
  meal,
  onEdit,
  onDelete,
}: {
  meal: Meal
  onEdit: (meal: Meal) => void
  onDelete: (mealId: string) => void
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 pt-5">
        {meal.photoUrl ? (
          <Image
            src={meal.photoUrl}
            alt={meal.description}
            width={1200}
            height={480}
            unoptimized
            className="h-44 w-full rounded-xl object-cover"
          />
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{meal.time}</p>
            <p className="text-xs text-muted-foreground">{meal.date}</p>
          </div>
          <Badge variant="secondary">{getMealTypeLabel(meal.mealType)}</Badge>
        </div>
        <p className="text-sm leading-relaxed">{meal.description}</p>
        {meal.notes ? <p className="text-xs text-muted-foreground">{meal.notes}</p> : null}
        <div className="flex flex-wrap gap-2">
          {meal.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex">
          <Button size="sm" className="w-full sm:w-auto" variant="outline" onClick={() => onEdit(meal)}>
            <PencilSimpleLine className="mr-1 size-4" />
            Editar
          </Button>
          <Button size="sm" className="w-full sm:w-auto" variant="destructive" onClick={() => onDelete(meal.id)}>
            <Trash className="mr-1 size-4" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
