import { useState } from "react";
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loginThunk } from '../store/authSlice'
import { useNavigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from "../lib/validation/auth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import AuthLayout from "../app/AuthLayout";

export default function Login() {
    const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof LoginInput, string>>
	>({});
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const status = useAppSelector((s) => s.auth.status)

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const parsed = loginSchema.safeParse(form);
		if (!parsed.success) {
			const fe = parsed.error.flatten().fieldErrors;
			setFieldErrors({
				email: fe.email?.[0],
				password: fe.password?.[0],
			});
			return;
		}
		setFieldErrors({});
        const result = await dispatch(loginThunk(parsed.data))
        if (loginThunk.fulfilled.match(result)) {
            navigate('/dashboard', { replace: true })
        } else {
            setError('Login failed. Check your credentials and try again.')
			setForm({ ...form, password: "" });
        }
	}

	return (
		<AuthLayout
			title="Sign in"
			subtitle="Access your personal finance dashboard"
		>
			<form onSubmit={onSubmit} className="space-y-4" noValidate>
				<div>
					<label
						htmlFor="email"
                    className="block text-sm font-medium text-color-surface-subtle"
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
					aria-describedby={fieldErrors.email ? "email-error" : undefined}
					aria-invalid={fieldErrors.email ? "true" : "false"}
						className="mt-1"
					/>
				{fieldErrors.email && (
					<p id="email-error" className="mt-1 text-sm text-error-600">{fieldErrors.email}</p>
				)}
				</div>
				<div>
					<label
						htmlFor="password"
                    className="block text-sm font-medium text-color-surface-subtle"
					>
						Password
					</label>
					<Input
						id="password"
						type="password"
						autoComplete="current-password"
					value={form.password}
					onChange={(e) => {
						setForm({ ...form, password: e.target.value });
						if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
					}}
						required
					aria-describedby={fieldErrors.password ? "password-error" : undefined}
					aria-invalid={fieldErrors.password ? "true" : "false"}
						className="mt-1"
					/>
				{fieldErrors.password && (
					<p id="password-error" className="mt-1 text-sm text-error-600">{fieldErrors.password}</p>
				)}
				</div>
				{error && (
					<p className="text-error-600" role="alert">
						{error}
					</p>
				)}
                <Button type="submit" disabled={status === 'loading'} aria-busy={status === 'loading'}>
                    {status === 'loading' ? "Signing in…" : "Sign in"}
				</Button>
			</form>
            <p className="mt-6 text-center text-sm text-color-surface-subtle">
				Don't have an account?{" "}
				<a
					href="/register"
                    className="font-medium text-primary-600 hover:text-primary-700"
				>
					Create account
				</a>
			</p>
		</AuthLayout>
	);
}
