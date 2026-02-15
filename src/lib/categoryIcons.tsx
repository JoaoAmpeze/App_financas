import type { LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

export const CATEGORY_ICON_NAMES = [
  'UtensilsCrossed', 'Car', 'Home', 'Heart', 'Gamepad2', 'Circle',
  'ShoppingCart', 'Plane', 'GraduationCap', 'Dumbbell', 'Music', 'Palette',
  'Wallet', 'PiggyBank', 'Gift', 'Coffee', 'Briefcase', 'Building2', 'TrendingUp'
] as const

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number]

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed: LucideIcons.UtensilsCrossed,
  Car: LucideIcons.Car,
  Home: LucideIcons.Home,
  Heart: LucideIcons.Heart,
  Gamepad2: LucideIcons.Gamepad2,
  Circle: LucideIcons.Circle,
  ShoppingCart: LucideIcons.ShoppingCart,
  Plane: LucideIcons.Plane,
  GraduationCap: LucideIcons.GraduationCap,
  Dumbbell: LucideIcons.Dumbbell,
  Music: LucideIcons.Music,
  Palette: LucideIcons.Palette,
  Wallet: LucideIcons.Wallet,
  PiggyBank: LucideIcons.PiggyBank,
  Gift: LucideIcons.Gift,
  Coffee: LucideIcons.Coffee,
  Briefcase: LucideIcons.Briefcase,
  Building2: LucideIcons.Building2,
  TrendingUp: LucideIcons.TrendingUp
}

export function CategoryIcon({ icon, className, size = 18 }: { icon: string; className?: string; size?: number }) {
  const Component = iconMap[icon] ?? LucideIcons.Circle
  return <Component className={className} size={size} />
}

export { CATEGORY_ICON_NAMES as ICON_OPTIONS }
