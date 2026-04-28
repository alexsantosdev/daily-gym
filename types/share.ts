export type ShareCardType =
  | "workout"
  | "activity"
  | "streak"
  | "competition"
  | "monthly_recap"

export interface ShareMetric {
  label: string
  value: string | number
  suffix?: string
  highlight?: boolean
}

export interface ShareCardData {
  type: ShareCardType
  title: string
  subtitle?: string
  userName: string
  date: string
  metrics: ShareMetric[]
  photoUrl?: string
  badge?: string
  highlight?: string
  footer?: string
}
