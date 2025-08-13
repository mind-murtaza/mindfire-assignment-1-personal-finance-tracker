import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signOut } from "../store/authSlice";
import { Menu, X } from "lucide-react";

export default function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const user = useAppSelector((s) => s.auth.user);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	function handleLogout() {
		dispatch(signOut());
		navigate("/login", { replace: true });
		setIsMobileMenuOpen(false);
	}

	function toggleMobileMenu() {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	}

	const linkBase = "px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors";
	const active = "text-primary-600 bg-primary-50";
	const idle = "text-neutral-700";
	const mobileLinkBase = "block px-3 py-2 rounded-md text-base font-medium hover:bg-neutral-50 transition-colors";

	return (
		<header className="border-b border-neutral-200 bg-white sticky top-0 z-50">
			<div className="container">
				<div className="h-14 flex items-center justify-between">
					<Link to="/" className="text-lg font-semibold text-neutral-900">
						Personal Finance Tracker
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center gap-1">
						{user ? (
							<>
								<NavLink
									to="/dashboard"
									className={({ isActive }) =>
										`${linkBase} ${isActive ? active : idle}`
									}
								>
									Dashboard
								</NavLink>
								<NavLink
									to="/categories"
									className={({ isActive }) =>
										`${linkBase} ${isActive ? active : idle}`
									}
								>
									Categories
								</NavLink>
								<NavLink
									to="/transactions"
									className={({ isActive }) =>
										`${linkBase} ${isActive ? active : idle}`
									}
								>
									Transactions
								</NavLink>
								<NavLink
									to="/profile"
									className={({ isActive }) =>
										`${linkBase} ${isActive ? active : idle}`
									}
								>
									Profile
								</NavLink>
								<button
									onClick={handleLogout}
									className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
								>
									Logout
								</button>
							</>
						) : (
							<>
								<NavLink
									to="/login"
									className={({ isActive }) =>
										`${linkBase} ${isActive ? active : idle}`
									}
								>
									Login
								</NavLink>
								<NavLink
									to="/register"
									className={({ isActive }) =>
										`${linkBase} ${isActive ? active : idle}`
									}
								>
									Register
								</NavLink>
							</>
						)}
					</nav>

					{/* Mobile Menu Button */}
					<button
						onClick={toggleMobileMenu}
						className="md:hidden p-2 rounded-md text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
						aria-expanded={isMobileMenuOpen}
						aria-label="Toggle menu"
					>
						{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
					</button>
				</div>

				{/* Mobile Navigation Menu */}
				{isMobileMenuOpen && (
					<div className="md:hidden border-t border-neutral-200 bg-white">
						<nav className="px-2 pt-2 pb-3 space-y-1">
							{user ? (
								<>
									<NavLink
										to="/dashboard"
										onClick={() => setIsMobileMenuOpen(false)}
										className={({ isActive }) =>
											`${mobileLinkBase} ${isActive ? active : idle}`
										}
									>
										Dashboard
									</NavLink>
									<NavLink
										to="/categories"
										onClick={() => setIsMobileMenuOpen(false)}
										className={({ isActive }) =>
											`${mobileLinkBase} ${isActive ? active : idle}`
										}
									>
										Categories
									</NavLink>
									<NavLink
										to="/transactions"
										onClick={() => setIsMobileMenuOpen(false)}
										className={({ isActive }) =>
											`${mobileLinkBase} ${isActive ? active : idle}`
										}
									>
										Transactions
									</NavLink>
									<NavLink
										to="/profile"
										onClick={() => setIsMobileMenuOpen(false)}
										className={({ isActive }) =>
											`${mobileLinkBase} ${isActive ? active : idle}`
										}
									>
										Profile
									</NavLink>
									<button
										onClick={handleLogout}
										className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
									>
										Logout
									</button>
								</>
							) : (
								<>
									<NavLink
										to="/login"
										onClick={() => setIsMobileMenuOpen(false)}
										className={({ isActive }) =>
											`${mobileLinkBase} ${isActive ? active : idle}`
										}
									>
										Login
									</NavLink>
									<NavLink
										to="/register"
										onClick={() => setIsMobileMenuOpen(false)}
										className={({ isActive }) =>
											`${mobileLinkBase} ${isActive ? active : idle}`
										}
									>
										Register
									</NavLink>
								</>
							)}
						</nav>
					</div>
				)}
			</div>
		</header>
	);
}
