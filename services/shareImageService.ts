import {
  downloadShareImage,
  generateShareImage,
  getShareFileName,
  getShareTitle,
  shareImage,
} from "@/lib/share"
import type { ShareCardData } from "@/types/share"

export async function generateHtmlShareImage(element: HTMLElement): Promise<Blob> {
  return generateShareImage(element)
}

export async function generateAIShareImagePlaceholder(data: ShareCardData): Promise<null> {
  // Future integration point:
  // send WorkoutShareCardData to OpenAI Images preserving the same visual direction.
  void data
  return null
}

export async function shareOrDownloadHtmlCard(params: {
  element: HTMLElement
  cardType: ShareCardData["type"]
}): Promise<void> {
  const blob = await generateHtmlShareImage(params.element)
  const fileName = getShareFileName(params.cardType)
  const title = getShareTitle(params.cardType)
  const shared = await shareImage(blob, title, fileName)

  if (!shared) {
    downloadShareImage(blob, fileName)
  }
}
