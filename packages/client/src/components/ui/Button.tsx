import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
	primary:
		"text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-700",
	secondary:
		"text-primary-700 bg-primary-50 hover:bg-primary-100 active:bg-primary-100 border border-primary-200",
	outline:
		"text-slate-700 border border-slate-300 bg-transparent hover:bg-slate-50/70",
	ghost: "text-slate-700 hover:bg-slate-100",
	destructive: "text-white bg-red-600 hover:bg-red-700",
};

const SIZE: Record<Size, string> = {
	sm: "h-9 px-3 text-sm",
	md: "h-10 px-4 text-sm",
	lg: "h-11 px-5 text-base",
};

export function Button({
	className,
	variant = "primary",
	size = "md",
	leftIcon,
	rightIcon,
	children,
	...props
}: ButtonProps) {
	return (
		<button
			className={cn(
				"inline-flex items-center cursor-pointer justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
				VARIANT[variant],
				SIZE[size],
				className
			)}
			{...props}
		>
			{leftIcon}
			{children}
			{rightIcon}
		</button>
	);
}

export default Button;
