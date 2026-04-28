export interface AppUser {
  id: string
  name: string
  email: string
  photoURL?: string | null
  createdAt: string
}

export interface UserProfileInput {
  name: string
  email: string
  photoURL?: string | null
}
