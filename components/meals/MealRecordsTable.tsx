import { PencilSimpleLine, Trash } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { getMealTypeLabel } from "@/lib/labels"
import type { Meal } from "@/types/meal"

export function MealRecordsTable({
  meals,
  onEdit,
  onDelete,
}: {
  meals: Meal[]
  onEdit: (meal: Meal) => void
  onDelete: (mealId: string) => void
}) {
  if (meals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
  }

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card lg:block">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Hora</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Descricao</th>
            <th className="px-3 py-2">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => (
            <tr key={meal.id} className="border-t border-border">
              <td className="px-3 py-2">{meal.date}</td>
              <td className="px-3 py-2">{meal.time}</td>
              <td className="px-3 py-2">{getMealTypeLabel(meal.mealType)}</td>
              <td className="px-3 py-2">{meal.description}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Button size="xs" variant="outline" onClick={() => onEdit(meal)}>
                    <PencilSimpleLine className="mr-1 size-3" />
                    Editar
                  </Button>
                  <Button size="xs" variant="destructive" onClick={() => onDelete(meal.id)}>
                    <Trash className="mr-1 size-3" />
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
