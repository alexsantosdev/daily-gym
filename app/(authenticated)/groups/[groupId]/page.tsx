"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { Copy, ImagesSquare } from "@phosphor-icons/react"

import { GroupActivityFeed } from "@/components/groups/GroupActivityFeed"
import { GroupLeaderboard } from "@/components/groups/GroupLeaderboard"
import { GroupMemberProgress } from "@/components/groups/GroupMemberProgress"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { calculateGroupScore } from "@/lib/groupScore"
import { getDateRangeFromPreset } from "@/lib/date"
import { useAuth } from "@/hooks/useAuth"
import { getGroupActivities } from "@/services/groupActivityService"
import { getGroupById, getGroupMembers } from "@/services/groupService"
import type { Group, GroupActivity, GroupMember } from "@/types/group"

type PeriodKey = "7d" | "current_month"

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "current_month", label: "Mes atual" },
]

export default function GroupDetailsPage() {
  const params = useParams<{ groupId: string }>()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [activities, setActivities] = useState<GroupActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>("7d")
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")

  const loadGroupData = useCallback(async (groupId: string, userId: string) => {
    setIsLoading(true)
    const range = getDateRangeFromPreset(period)
    const [nextGroup, nextMembers, nextActivities] = await Promise.all([
      getGroupById(groupId),
      getGroupMembers(groupId),
      getGroupActivities(groupId, { start: range.periodStart, end: range.periodEnd }),
    ])

    const canAccess = nextGroup ? nextGroup.memberIds.includes(userId) : false
    setGroup(canAccess ? nextGroup : null)
    setMembers(nextMembers)
    setActivities(nextActivities)
    setIsLoading(false)
  }, [period])

  useEffect(() => {
    if (!params.groupId || !user?.uid) {
      return
    }

    void loadGroupData(params.groupId, user.uid)
  }, [loadGroupData, params.groupId, user?.uid])

  const visibleActivities = useMemo(() => {
    if (selectedMemberFilter === "all") {
      return activities
    }

    return activities.filter((activity) => activity.userId === selectedMemberFilter)
  }, [activities, selectedMemberFilter])

  const ranking = useMemo(() => calculateGroupScore(visibleActivities, members), [members, visibleActivities])

  const metrics = useMemo(() => {
    const workouts = visibleActivities.filter((activity) => activity.type === "workout_completed").length
    const checkins = visibleActivities.filter((activity) => activity.type === "workout_checkin").length
    const activitiesCount = visibleActivities.filter((activity) => activity.type === "activity_completed").length
    const photos = visibleActivities.filter(
      (activity) => activity.type === "workout_photo" || activity.type === "activity_photo"
    ).length
    return { workouts, checkins, photos, activitiesCount }
  }, [visibleActivities])

  const photoActivities = useMemo(
    () => visibleActivities.filter((activity) => Boolean(activity.photoUrl)).slice(0, 8),
    [visibleActivities]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-52" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!group) {
    return (
      <Card className="border-border/70">
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">Grupo nao encontrado ou indisponivel.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title={group.name} description="Placar, feed e progresso competitivo do grupo." />

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Header do grupo</span>
            <Badge variant="secondary">{members.filter((member) => member.status === "active").length} membros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
            <span className="font-medium">Codigo:</span>
            <span>{group.inviteCode}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => navigator.clipboard.writeText(group.inviteCode)}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-3">
            <Badge variant="outline">Treinos: {metrics.workouts}</Badge>
            <Badge variant="outline">Atividades: {metrics.activitiesCount}</Badge>
            <Badge variant="outline">Check-ins: {metrics.checkins}</Badge>
            <Badge variant="outline">Fotos: {metrics.photos}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={period} onChange={(event) => setPeriod(event.target.value as PeriodKey)}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={selectedMemberFilter} onChange={(event) => setSelectedMemberFilter(event.target.value)}>
              <option value="all">Todos os membros</option>
              {members
                .filter((member) => member.status === "active")
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName || member.email}
                  </option>
                ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <GroupLeaderboard scores={ranking} currentUserId={user?.uid} />
        <GroupMemberProgress scores={ranking} />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ImagesSquare className="size-5 text-primary" />
            Fotos recentes da competicao
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photoActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma foto registrada no periodo.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photoActivities.map((activity) => (
                <div key={activity.id} className="overflow-hidden rounded-lg border border-border/70">
                  <Image
                    src={activity.photoUrl!}
                    alt={activity.title}
                    width={320}
                    height={320}
                    unoptimized
                    className="h-24 w-full object-cover"
                  />
                  <p className="truncate px-2 py-1 text-[11px] text-muted-foreground">{activity.userName}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GroupActivityFeed activities={visibleActivities} />
    </div>
  )
}
