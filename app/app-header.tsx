"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { stopDemoMode } from "@/lib/demo-auth";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AppHeaderProps = {
  title: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: "home" | "user" | "brain" | "calendar" | "matrix" | "projects";
  activePath?: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: "home",
  },
  {
    href: "/personal",
    label: "Persoenlicher Bereich",
    icon: "user",
  },
  {
    href: "/plasticity",
    label: "Plasticity",
    icon: "brain",
  },
  {
    href: "/learning?panel=calendar",
    label: "Kalender",
    icon: "calendar",
    activePath: "/learning",
  },
  {
    href: "/eisenhower",
    label: "Eisenhower",
    icon: "matrix",
  },
  {
    href: "/projects",
    label: "Projekte",
    icon: "projects",
  },
] as const;

export function AppHeader({ title }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    stopDemoMode();
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="relative left-1/2 mb-8 flex min-h-32 w-[calc(100vw-2rem)] max-w-6xl -translate-x-1/2 flex-col justify-between gap-5 border-b border-zinc-200 pb-6">
      <div className="min-w-0">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          Neuroplex
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      </div>

      <nav
        aria-label="Hauptnavigation"
        className="grid w-max grid-cols-7 gap-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === (item.activePath ?? item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-md transition ${
                isActive
                  ? "bg-zinc-950 text-white hover:bg-zinc-800"
                  : "border border-zinc-300 bg-white text-zinc-900 hover:border-zinc-950"
              }`}
            >
              <NavIcon icon={item.icon} />
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Abmelden"
          title="Abmelden"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
        >
          <LogoutIcon />
        </button>
      </nav>
    </header>
  );
}

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  if (icon === "home") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="m3 10 9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (icon === "user") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M20 21a8 8 0 0 0-16 0" />
        <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
      </svg>
    );
  }

  if (icon === "brain") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M9 4.5A3.5 3.5 0 0 0 5.5 8" />
        <path d="M15 4.5A3.5 3.5 0 0 1 18.5 8" />
        <path d="M5.5 8A3.5 3.5 0 0 0 4 14.5" />
        <path d="M18.5 8A3.5 3.5 0 0 1 20 14.5" />
        <path d="M4 14.5A3.5 3.5 0 0 0 9 19" />
        <path d="M20 14.5A3.5 3.5 0 0 1 15 19" />
        <path d="M12 5v14" />
        <path d="M9 9h3" />
        <path d="M12 12h3" />
        <path d="M9 15h3" />
      </svg>
    );
  }

  if (icon === "calendar") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
        <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (icon === "projects") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
        <path d="M7 4v16" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 4h16v16H4Z" />
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
      <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
      <path d="M14 21h5a2 2 0 0 0 2-2" />
    </svg>
  );
}
