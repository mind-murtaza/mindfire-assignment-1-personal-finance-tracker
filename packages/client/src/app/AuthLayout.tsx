import type { ReactNode } from "react";
import Card from "../components/ui/Card";

interface AuthLayoutProps {
	title: string;
	subtitle?: string;
	children: ReactNode;
}

export default function AuthLayout({
	title,
	subtitle,
	children,
}: AuthLayoutProps) {
	return (
		<div className="container py-8 md:py-12">
			<div className="max-w-md mx-auto">
				<Card className="p-6 md:p-8">
					<h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 mb-2">
						{title}
					</h2>
					{subtitle && (
						<p className="text-sm leading-6 text-slate-600 mb-6">{subtitle}</p>
					)}
					{children}
				</Card>
			</div>
		</div>
	);
}
