import { http } from "../http";
import { createLogger } from "../../lib/logger";
import type { AuthUser } from "../api/auth";

const log = createLogger("api:users");

type ApiUserResponse = {
	success?: boolean;
	data?: { user?: AuthUser };
};

export async function getMe(): Promise<AuthUser> {
	log.debug("me start");
	const res = await http.get<ApiUserResponse>("/users/me");
	const user = res.data.data?.user;
	if (!user) throw new Error("No user in response");
	log.debug("me success");
	return user as AuthUser;
}

export async function updateProfile(
	payload: Partial<{
		firstName: string;
		lastName: string;
		avatarUrl?: string | null;
		mobileNumber?: string | null;
	}>
): Promise<AuthUser> {
	log.info("update profile");
	const res = await http.patch<ApiUserResponse>("/users/me/profile", payload);
	const user = res.data.data?.user;
	if (!user) throw new Error("No user in response");
	return user as AuthUser;
}

export async function updateSettings(
	payload: Partial<{
		currency: string;
		theme: "light" | "dark" | "system";
		mobileDialCode?: string;
	}>
): Promise<AuthUser> {
	log.info("update settings");
	const res = await http.patch<ApiUserResponse>("/users/me/settings", payload);
	const user = res.data.data?.user;
	if (!user) throw new Error("No user in response");
	return user as AuthUser;
}
