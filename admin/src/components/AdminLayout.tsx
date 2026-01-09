"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChartBarIcon, CalendarIcon, ShieldCheckIcon, CogIcon } from "./Icons";

type AdminLayoutProps = {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: string;
};

export function AdminLayout({ children, userEmail, userRole }: AdminLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: ChartBarIcon },
    { href: "/admin/teams", label: "Manage Teams", icon: CalendarIcon },
    { href: "/admin/access", label: "Access Control", icon: ShieldCheckIcon },
    { href: "/admin/settings", label: "Settings", icon: CogIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C8102E] rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">CSEC Calendar Admin</h1>
                <p className="text-xs text-gray-500">Team Management Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700 hidden md:block">
                <span className="font-medium">{userEmail}</span>
                {userRole && (
                  <span className="ml-2 px-2 py-1 text-xs font-semibold rounded bg-[#C8102E] text-white">
                    {userRole}
                  </span>
                )}
              </div>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#C8102E] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
