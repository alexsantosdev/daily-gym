"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function JoinGroupForm({
  isSubmitting,
  onJoin,
}: {
  isSubmitting?: boolean
  onJoin: (inviteCode: string) => Promise<void>
}) {
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Entrar com codigo</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)

            if (!inviteCode.trim()) {
              setError("Informe o codigo de convite.")
              return
            }

            void onJoin(inviteCode.trim().toUpperCase())
              .then(() => setInviteCode(""))
              .catch((nextError) => {
                setError(nextError instanceof Error ? nextError.message : "Falha ao entrar no grupo.")
              })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="group-invite-code">Codigo</Label>
            <Input
              id="group-invite-code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" variant="outline" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar no grupo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
