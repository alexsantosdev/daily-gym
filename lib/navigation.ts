export const DEFAULT_AUTHENTICATED_ROUTE = "/calendar"

export const PRIMARY_NAV_ITEMS = [
  { href: "/calendar", label: "Calendario", icon: "calendar" },
  { href: "/workouts", label: "Treinos", icon: "workouts" },
  { href: "/meals", label: "Refeicoes", icon: "meals" },
  { href: "/reports", label: "Relatorios", icon: "reports" },
] as const

export const SECONDARY_NAV_ITEMS = [
  { href: "/groups", label: "Competicao", icon: "groups" },
  { href: "/water", label: "Hidratacao", icon: "water" },
  { href: "/personal-ai", label: "Personal IA", icon: "personal-ai" },
] as const

export const DESKTOP_NAV_ITEMS = [
  ...PRIMARY_NAV_ITEMS,
  ...SECONDARY_NAV_ITEMS,
] as const
export const MOBILE_NAV_ITEMS = [
  PRIMARY_NAV_ITEMS[0],
  PRIMARY_NAV_ITEMS[1],
  PRIMARY_NAV_ITEMS[2],
  PRIMARY_NAV_ITEMS[3],
  SECONDARY_NAV_ITEMS[0],
] as const
