"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function getDefaultEndDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

export function CreateGroupForm({
  isSubmitting,
  onCreate,
}: {
  isSubmitting?: boolean
  onCreate: (name: string, endDate: string) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [endDate, setEndDate] = useState(getDefaultEndDate())
  const [error, setError] = useState<string | null>(null)

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Criar grupo</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)

            if (!name.trim()) {
              setError("Informe um nome para o grupo.")
              return
            }

            if (!endDate) {
              setError("Informe a data de encerramento.")
              return
            }

            void onCreate(name.trim(), endDate)
              .then(() => {
                setName("")
                setEndDate(getDefaultEndDate())
              })
              .catch((nextError) => {
                setError(nextError instanceof Error ? nextError.message : "Falha ao criar grupo.")
              })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="group-name">Nome do grupo</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Casal Daily Gym"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-end-date">Encerramento da competicao</Label>
            <Input
              id="group-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar grupo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
