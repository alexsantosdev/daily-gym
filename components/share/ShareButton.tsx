"use client"

import { useMemo, useRef, useState } from "react"

import { ArrowSquareOut, DownloadSimple, X } from "@phosphor-icons/react"

import { ShareCardGenerator } from "@/components/share/ShareCardGenerator"
import { ShareCardPreview } from "@/components/share/ShareCardPreview"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  downloadShareImage,
  generateShareImage,
  getShareFileName,
  getShareTitle,
  shareImage,
} from "@/lib/share"
import type { ShareCardData, ShareCardType } from "@/types/share"

export function ShareButton({
  cardType,
  data,
  label = "Compartilhar",
  size = "sm",
  variant = "outline",
}: {
  cardType: ShareCardType
  data: ShareCardData
  label?: string
  size?: "xs" | "sm" | "default" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link"
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const filename = useMemo(() => getShareFileName(cardType), [cardType])

  async function createImageBlob() {
    if (!cardRef.current) {
      throw new Error("Preview indisponivel para gerar imagem.")
    }

    setIsGenerating(true)
    try {
      return await generateShareImage(cardRef.current)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownload() {
    const blob = await createImageBlob()
    downloadShareImage(blob, filename)
  }

  async function handleShare() {
    const blob = await createImageBlob()
    const shared = await shareImage(blob, getShareTitle(cardType), filename)

    if (!shared) {
      downloadShareImage(blob, filename)
    }
  }

  return (
    <>
      <Button type="button" size={size} variant={variant} onClick={() => setIsOpen(true)}>
        <ArrowSquareOut data-icon="inline-start" />
        {label}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/75 p-3 backdrop-blur-sm sm:items-center">
          <Card className="w-full max-w-md border-border/70">
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Preview de compartilhamento</p>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => setIsOpen(false)}>
                  <X />
                </Button>
              </div>

              <ShareCardPreview data={data} cardRef={cardRef} />

              <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                <Button
                  type="button"
                  className="h-11"
                  onClick={() => void handleShare()}
                  disabled={isGenerating}
                >
                  <ArrowSquareOut data-icon="inline-start" />
                  {isGenerating ? "Gerando..." : "Compartilhar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => void handleDownload()}
                  disabled={isGenerating}
                >
                  <DownloadSimple data-icon="inline-start" />
                  {isGenerating ? "Gerando..." : "Baixar imagem"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px]">
        <ShareCardGenerator data={data} />
      </div>
    </>
  )
}
