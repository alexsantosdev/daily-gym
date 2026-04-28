"use client"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"

export default function SettingsPage() {
  const { user, isFirebaseReady } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Informações da conta e status de integrações da primeira entrega."
      />

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Nome:</span> {user?.displayName || "Não informado"}
          </p>
          <p>
            <span className="font-medium">E-mail:</span> {user?.email}
          </p>
          <p>
            <span className="font-medium">UID:</span> {user?.uid}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status de integrações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span>Firebase</span>
            <Badge variant={isFirebaseReady ? "default" : "outline"}>
              {isFirebaseReady ? "Configurado" : "Pendente"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span>OpenAI API (futura)</span>
            <Badge variant="outline">Preparada via rota server-side</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
