"use client"

import type { RefObject } from "react"

import { ShareCard } from "@/components/share/ShareCard"
import type { ShareCardData } from "@/types/share"

export function ShareCardPreview({
  data,
  cardRef,
}: {
  data: ShareCardData
  cardRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="flex justify-center">
      <div ref={cardRef} className="w-full max-w-[360px]">
        <ShareCard data={data} />
      </div>
    </div>
  )
}
