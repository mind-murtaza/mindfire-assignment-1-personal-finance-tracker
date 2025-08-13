import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchMeThunk } from "../store/authSlice";
import { getToken } from "../services/auth";
import { createLogger } from "../lib/logger";

const log = createLogger("AuthInitializer");

export default function AuthInitializer({
	children,
}: {
	children: React.ReactNode;
}) {
	const dispatch = useAppDispatch();
	const { user, status } = useAppSelector((s) => s.auth);

	useEffect(() => {
		const token = getToken();

		// If we have a token but no user data, fetch it
		if (token && !user && status === "idle") {
			log.info("Token found but no user data, fetching user...");
			dispatch(fetchMeThunk());
		}
	}, [dispatch, user, status]);

	return <>{children}</>;
}
