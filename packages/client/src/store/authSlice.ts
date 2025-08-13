import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
	loginApi,
	registerApi,
	meApi,
	type AuthUser,
} from "../services/api/auth";
import { setToken, clearToken } from "../services/auth";
import type { LoginInput, RegisterInput } from "../lib/validation/auth";
import axios from 'axios';

export interface AuthState {
	user: AuthUser | null;
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | null;
}

const initialState: AuthState = {
	user: null,
	status: "idle",
	error: null,
};

type RejectErr = { message: string; field?: 'email' | 'password' | 'firstName' | 'lastName' }

export const loginThunk = createAsyncThunk<
	{ token: string; user: AuthUser },
	LoginInput,
	{ rejectValue: RejectErr }
>(
	"auth/login",
	async (payload: LoginInput, { rejectWithValue }) => {
		try {
			const { token, user } = await loginApi(payload);
			setToken(token);
			return { token, user };
		} catch (err) {
			if (axios.isAxiosError(err)) {
				const msg = (err.response?.data as { message?: string })?.message ?? 'Invalid credentials';
				return rejectWithValue({ message: msg });
			}
			return rejectWithValue({ message: "Invalid credentials" });
		}
	}
);

export const registerThunk = createAsyncThunk<
	{ token: string; user: AuthUser },
	RegisterInput,
	{ rejectValue: RejectErr }
>(
	"auth/register",
	async (payload: RegisterInput, { rejectWithValue }) => {
		try {
			const { token, user } = await registerApi(payload);
			setToken(token);
			return { token, user };
		} catch (err) {
			if (axios.isAxiosError(err)) {
				const status = err.response?.status
				const body = err.response?.data as { 
					code?: string; 
					message?: string; 
					errors?: { email?: string[] } 
				}
				const code = body?.code
				const msg = body?.message ?? 'Registration failed'

				if (status === 409 || code === 'EMAIL_EXISTS') {
					return rejectWithValue({ field: 'email', message: 'Email already in use' })
				}
				const emailMsg = body?.errors?.email?.[0]
				if (emailMsg) return rejectWithValue({ field: 'email', message: emailMsg })

				return rejectWithValue({ message: msg })
			}
			return rejectWithValue({ message: "Registration failed" });
		}
	}
);

export const fetchMeThunk = createAsyncThunk(
	"auth/me",
	async (_, { rejectWithValue }) => {
		try {
			const user = await meApi();
			return user;
		} catch {
			return rejectWithValue("Failed to load user");
		}
	}
);

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		signOut(state) {
			state.user = null;
			clearToken();
		},
		setUser(state, action: PayloadAction<AuthUser>) {
			state.user = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(loginThunk.pending, (state) => {
				state.status = "loading";
				state.error = null;
			})
			.addCase(
				loginThunk.fulfilled,
				(state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
					state.status = "succeeded";
					state.user = action.payload.user;
				}
			)
			.addCase(loginThunk.rejected, (state, action) => {
				state.status = "failed";
				state.error = (action.payload as RejectErr)?.message ?? "Login failed";
			})

			.addCase(registerThunk.pending, (state) => {
				state.status = "loading";
				state.error = null;
			})
			.addCase(
				registerThunk.fulfilled,
				(state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
					state.status = "succeeded";
					state.user = action.payload.user;
				}
			)
			.addCase(registerThunk.rejected, (state, action) => {
				state.status = "failed";
				state.error = (action.payload as RejectErr)?.message ?? "Registration failed";
			})

			.addCase(fetchMeThunk.pending, (state) => {
				state.status = "loading";
			})
			.addCase(
				fetchMeThunk.fulfilled,
				(state, action: PayloadAction<AuthUser>) => {
					state.status = "succeeded";
					state.user = action.payload;
				}
			)
			.addCase(fetchMeThunk.rejected, (state, action) => {
				state.status = "failed";
				state.error = (action.payload as string) ?? "Failed to load user";
			});
	},
});

export const { signOut, setUser } = authSlice.actions;
export default authSlice.reducer;