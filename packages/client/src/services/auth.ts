let inMemoryToken: string | null = null;


const STORAGE_KEY = import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY;

export function getToken(): string | null {
	if (inMemoryToken) return inMemoryToken;
	const stored =
		typeof localStorage !== "undefined"
			? localStorage.getItem(STORAGE_KEY)
			: null;
	inMemoryToken = stored ? stored : null;
	return inMemoryToken;
}

export function setToken(token: string): void {
	inMemoryToken = token;
	if (typeof localStorage !== "undefined")
		localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
	inMemoryToken = null;
	if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

export function getAuthHeader(): Record<string, string> | undefined {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : undefined;
}
