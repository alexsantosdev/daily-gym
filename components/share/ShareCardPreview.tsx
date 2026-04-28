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
    <div className="mx-auto w-[236px] sm:w-[300px] md:w-[340px]">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border/70 bg-black/25">
        <div className="absolute left-0 top-0 origin-top-left scale-[0.2185] sm:scale-[0.2778] md:scale-[0.3148]">
          <div ref={cardRef}>
            <ShareCard data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
