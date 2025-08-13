import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { registerThunk } from "../store/authSlice";
import { useNavigate } from "react-router-dom";
import { registerSchema, type RegisterInput } from "../lib/validation/auth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import AuthLayout from "../app/AuthLayout";
import { createLogger } from "../lib/logger";

export default function Register() {
	const log = createLogger("pages:register");
	const [form, setForm] = useState<RegisterInput>({
		email: "",
		password: "",
		firstName: "",
		lastName: "",
	});
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof RegisterInput, string>>
	>({});
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const status = useAppSelector((s) => s.auth.status);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const parsed = registerSchema.safeParse(form);
		if (!parsed.success) {
			const fe = parsed.error.flatten().fieldErrors;
			setFieldErrors({
				firstName: fe.firstName?.[0],
				lastName: fe.lastName?.[0],
				email: fe.email?.[0],
				password: fe.password?.[0],
			});
			return;
		}
		setFieldErrors({});
		const result = await dispatch(registerThunk(parsed.data));
		if (registerThunk.fulfilled.match(result)) {
			navigate("/dashboard", { replace: true });
		} else {
			log.error("registration failed", result);
			setError("Registration failed. Try a different email.");
			setForm({ ...form, password: "" });
		}
	}

	return (
		<AuthLayout
			title="Create account"
			subtitle="Start tracking your income and expenses"
		>
			<form onSubmit={onSubmit} className="space-y-4" noValidate>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="firstName"
							className="block text-sm font-medium text-slate-700"
						>
							First name
						</label>
						<Input
							id="firstName"
					value={form.firstName}
					onChange={(e) => {
						setForm({ ...form, firstName: e.target.value });
						if (fieldErrors.firstName)
							setFieldErrors({ ...fieldErrors, firstName: undefined });
					}}
							required
							className="mt-1"
						/>
				{fieldErrors.firstName && (
					<p id="firstName-error" className="mt-1 text-sm text-error-600">
						{fieldErrors.firstName}
					</p>
				)}
					</div>
					<div>
						<label
							htmlFor="lastName"
							className="block text-sm font-medium text-slate-700"
						>
							Last name
						</label>
						<Input
							id="lastName"
					value={form.lastName}
					onChange={(e) => {
						setForm({ ...form, lastName: e.target.value });
						if (fieldErrors.lastName)
							setFieldErrors({ ...fieldErrors, lastName: undefined });
					}}
							required
							className="mt-1"
						/>
				{fieldErrors.lastName && (
					<p id="lastName-error" className="mt-1 text-sm text-error-600">
						{fieldErrors.lastName}
					</p>
				)}
					</div>
				</div>
				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-slate-700"
					>
						Email
					</label>
					<Input
						id="email"
						type="email"
						autoComplete="email"
					value={form.email}
					onChange={(e) => {
						setForm({ ...form, email: e.target.value });
						if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
					}}
						required
						className="mt-1"
					/>
				{fieldErrors.email && (
					<p id="email-error" className="mt-1 text-sm text-error-600">
						{fieldErrors.email}
					</p>
				)}
				</div>
				<div>
					<label
						htmlFor="password"
						className="block text-sm font-medium text-slate-700"
					>
						Password
					</label>
					<Input
						id="password"
						type="password"
						autoComplete="new-password"
					value={form.password}
					onChange={(e) => {
						setForm({ ...form, password: e.target.value });
						if (fieldErrors.password)
							setFieldErrors({ ...fieldErrors, password: undefined });
					}}
						required
						className="mt-1"
					/>
				{fieldErrors.password && (
					<p id="password-error" className="mt-1 text-sm text-error-600">
						{fieldErrors.password}
					</p>
				)}
				</div>
				{error && (
					<p className="text-error-600" role="alert">
						{error}
					</p>
				)}
				<Button type="submit" disabled={status === "loading"} aria-busy={status === "loading"}>
					{status === "loading" ? "Creating…" : "Create account"}
				</Button>
			</form>
			<p className="mt-6 text-center text-sm text-slate-600">
				Already have an account?{" "}
				<a
					href="/login"
					className="font-medium text-primary-600 hover:text-primary-700"
				>
					Sign in
				</a>
			</p>
		</AuthLayout>
	);
}
