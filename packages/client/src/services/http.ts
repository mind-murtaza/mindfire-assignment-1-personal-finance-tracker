import axios, { AxiosError } from "axios";
import { createLogger } from "../lib/logger";
import type {
	AxiosInstance,
	InternalAxiosRequestConfig,
	AxiosHeaders,
	AxiosRequestHeaders,
} from "axios";
import { clearToken, getAuthHeader, getToken, setToken } from "./auth";
import { signOut } from "../store/authSlice";
import { useAppDispatch } from "../store/hooks";

const baseURL = import.meta.env.VITE_API_URL;
const log = createLogger('http');

let isRefreshing = false;
let pendingQueue: Array<{
	resolve: (value: unknown) => void;
	reject: (reason?: unknown) => void;
}> = [];

function subscribeTokenRefresh(): Promise<unknown> {
	return new Promise((resolve, reject) => {
		pendingQueue.push({ resolve, reject });
	});
}

function onRefreshed(success: boolean, newToken?: string) {
	pendingQueue.forEach(({ resolve, reject }) => {
		if (success) resolve(newToken);
		else {
			const dispatch = useAppDispatch();
			dispatch(signOut());
			reject(new Error("Token refresh failed"));
		}
	});
	pendingQueue = [];
}

export const http: AxiosInstance = axios.create({ baseURL });
log.info('initialized', { baseURL });

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
	config.headers = config.headers || {};
	const authHeader = getAuthHeader();
	if (authHeader) config.headers.Authorization = authHeader.Authorization;
  log.debug('request', { url: config.url, method: config.method, hasAuth: !!authHeader });
  return config;
});

http.interceptors.response.use(
  (response) => {
    log.debug('response', { url: response.config?.url, status: response.status });
    return response;
  },
	async (error: AxiosError) => {
    log.warn('response error', { url: error.config?.url, status: error.response?.status });
		const originalRequest = error.config as InternalAxiosRequestConfig & {
			_retry?: boolean;
		};

		const status = error.response?.status;
		if (status !== 401 || originalRequest?._retry) {
			return Promise.reject(error);
		}

		originalRequest._retry = true;

		function isAxiosHeaders(h: unknown): h is AxiosHeaders {
			return (
				!!h &&
				typeof h === "object" &&
				"set" in h &&
				typeof (h as AxiosHeaders).set === "function"
			);
		}

    if (isRefreshing) {
			try {
				await subscribeTokenRefresh();
				const hdr = getAuthHeader();
				if (hdr) {
					const current = originalRequest.headers;
					if (isAxiosHeaders(current)) {
						current.set("Authorization", hdr.Authorization as string);
					} else {
						const currentObj = (originalRequest.headers ||=
							{} as AxiosRequestHeaders);
						(currentObj as Record<string, string>)["Authorization"] =
							hdr.Authorization as string;
					}
				}
				return http(originalRequest);
			} catch {
				clearToken();
				return Promise.reject(error);
			}
		}

    isRefreshing = true;
    log.info('refresh start');
		try {
			const existing = getToken();
			if (!existing) throw new Error("No token to refresh");

			type RefreshResponse = {
				success?: boolean;
				data?: { token?: string };
				token?: string;
			};
			const res = await axios.post<RefreshResponse>(
				`${baseURL}/auth/refresh`,
				{},
				{ headers: { Authorization: `Bearer ${existing}` } }
			);

			const newToken = res.data.data?.token ?? res.data.token;
			if (!newToken) throw new Error("No token in refresh response");
      setToken(newToken);
      log.info('refresh success');
			onRefreshed(true, newToken);
			const hdr = getAuthHeader();
			if (hdr) {
				const current = originalRequest.headers;
				if (isAxiosHeaders(current)) {
					current.set("Authorization", hdr.Authorization as string);
				} else {
					const currentObj = (originalRequest.headers ||=
						{} as AxiosRequestHeaders);
					(currentObj as Record<string, string>)["Authorization"] =
						hdr.Authorization as string;
				}
			}
			return http(originalRequest);
    } catch (refreshErr) {
      log.error('refresh failed');
			onRefreshed(false);
			clearToken();
			return Promise.reject(refreshErr);
		} finally {
      isRefreshing = false;
      log.info('refresh end');
		}
	}
);
