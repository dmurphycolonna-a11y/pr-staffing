"use client";

import { useSession } from "next-auth/react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        {session?.user && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {session.user.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-700 leading-none">{session.user.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {session.user.role?.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
