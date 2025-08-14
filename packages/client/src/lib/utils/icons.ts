import { Tag, Wallet, ShoppingCart, Coffee, Car, Home, Heart, Gift, ShoppingBag, Bus, Pizza, Dumbbell, Briefcase, Plane, Phone, Tv, Book, Music, Hammer } from 'lucide-react'

export const ICONS = {
	tag: Tag,
	wallet: Wallet,
	'shopping-cart': ShoppingCart,
	coffee: Coffee,
	car: Car,
	home: Home,
	heart: Heart,
	gift: Gift,
	'shopping-bag': ShoppingBag,
	bus: Bus,
	pizza: Pizza,
	dumbbell: Dumbbell,
	briefcase: Briefcase,
	plane: Plane,
	phone: Phone,
	tv: Tv,
	book: Book,
	music: Music,
	hammer: Hammer,
} as const

export type IconKey = keyof typeof ICONS

export function getIcon(key: string) {
	return ICONS[key as IconKey] ?? Tag
}
