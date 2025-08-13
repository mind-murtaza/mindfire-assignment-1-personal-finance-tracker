import { http } from "../http";
import { createLogger } from "../../lib/logger";
const log = createLogger("api:auth");
import type { LoginInput, RegisterInput } from "../../lib/validation/auth";

export interface AuthUserProfile {
	firstName?: string;
	lastName?: string;
}

export interface AuthUser {
	id: string;
	email: string;
	profile?: AuthUserProfile;
}

type ApiAuthResponse = {
	success?: boolean;
	data?: { token?: string; user?: AuthUser };
	token?: string;
	user?: AuthUser;
};

export async function loginApi(
    payload: LoginInput
): Promise<{ token: string; user: AuthUser }> {
	log.info("login start");
	const res = await http.post<ApiAuthResponse>("/auth/login", payload);
    const token = res.data.data?.token ?? res.data.token;
    const user = res.data.data?.user ?? res.data.user;
    if (!token) throw new Error("No token received");
    if (!user) throw new Error("No user received");
	log.info("login success");
    return { token, user };
}

export async function registerApi(
    payload: RegisterInput
): Promise<{ token: string; user: AuthUser }> {
	log.info("register start");
	const res = await http.post<ApiAuthResponse>("/auth/register", {
		email: payload.email,
		password: payload.password,
		profile: { firstName: payload.firstName, lastName: payload.lastName },
	});
    const token = res.data.data?.token ?? res.data.token;
    const user = res.data.data?.user ?? res.data.user;
    if (!token) throw new Error("No token received");
    if (!user) throw new Error("No user received");
	log.info("register success");
    return { token, user };
}

export async function meApi(): Promise<AuthUser> {
	log.debug("me start");
	const res = await http.get<ApiAuthResponse>("/users/me");
	const user = res.data.data?.user ?? res.data.user;
	if (!user) throw new Error("No user in response");
	log.debug("me success");
	return user;
}
