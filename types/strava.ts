export interface StravaAthleteSummary {
  id: number
  firstname?: string
  lastname?: string
  profile?: string
}

export interface StravaTokenExchangeResponse {
  token_type: string
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  scope?: string
  athlete?: StravaAthleteSummary
}

export interface StravaConnection {
  userId: string
  athleteId: number
  athleteName: string
  scope: string[]
  accessToken: string
  refreshToken: string
  expiresAt: number
  connectedAt: string
  updatedAt: string
  lastSyncAt?: string
}

export interface StravaIntegrationStatus {
  connected: boolean
  athleteId?: number
  athleteName?: string
  scope?: string[]
  connectedAt?: string
  lastSyncAt?: string
}

export interface StravaSummaryActivity {
  id: number
  name: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain?: number
  sport_type?: string
  type?: string
  start_date?: string
  start_date_local?: string
  average_speed?: number
  average_heartrate?: number
  calories?: number
}
