"use client"

import Image from "next/image"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTimePtBr } from "@/lib/date"
import type { GroupActivity } from "@/types/group"

function getActivityMessage(activity: GroupActivity) {
  if (activity.type === "workout_completed") {
    return `${activity.userName} registrou um treino 🔥`
  }

  if (activity.type === "activity_completed") {
    return `${activity.userName} registrou uma atividade 🚶`
  }

  if (activity.type === "workout_photo" || activity.type === "activity_photo") {
    return `${activity.userName} compartilhou uma foto 📸`
  }

  if (activity.type === "workout_checkin") {
    return `${activity.userName} fez check-in no treino ✅`
  }

  return `${activity.userName} registrou uma atividade no grupo`
}

export function GroupActivityFeed({ activities }: { activities: GroupActivity[] }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Feed de atividades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">{getActivityMessage(activity)}</p>
              <p className="text-sm text-muted-foreground">{activity.title}</p>
              {activity.description ? <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p> : null}
              {activity.photoUrl ? (
                <Image
                  src={activity.photoUrl}
                  alt={activity.title}
                  width={640}
                  height={320}
                  unoptimized
                  className="mt-2 h-28 w-full rounded-lg object-cover"
                />
              ) : null}
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDateTimePtBr(activity.createdAt)}</span>
                <span>{activity.points} pts</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
