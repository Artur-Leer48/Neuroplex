"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { stopDemoMode } from "@/lib/demo-auth";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AppHeaderProps = {
  title: string;
};

type NavItem = {
  href: string;
  label: string;
  icon:
    | "user"
    | "brain"
    | "calendar"
    | "cards"
    | "matrix"
    | "projects"
    | "quests";
  activePath?: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Plasticity",
    icon: "brain",
    activePath: "/plasticity",
  },
  {
    href: "/learning?panel=calendar",
    label: "Kalender",
    icon: "calendar",
    activePath: "/learning",
  },
  {
    href: "/kartenwerk",
    label: "Kartenwerk",
    icon: "cards",
  },
] as const;

export function AppHeader({ title }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCompact, setIsCompact] = useState(false);
  const isCompactRef = useRef(false);

  useEffect(() => {
    function handleScroll() {
      const shouldBeCompact = isCompactRef.current
        ? window.scrollY > 8
        : window.scrollY > 96;

      if (shouldBeCompact === isCompactRef.current) {
        return;
      }

      isCompactRef.current = shouldBeCompact;
      setIsCompact(shouldBeCompact);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleLogout() {
    stopDemoMode();
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="relative mb-8 h-44">
      <header
        className={`sticky top-0 z-40 flex w-full flex-col border-b border-zinc-200 bg-zinc-50/95 backdrop-blur transition-[padding,gap,background-color] duration-200 ease-out ${
          isCompact ? "gap-0 py-3" : "gap-5 pb-6 pt-0"
        }`}
      >
        <nav
          aria-label="Hauptnavigation"
          className="flex w-full flex-wrap gap-2"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname === item.activePath;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                className={`flex h-[46px] w-[46px] items-center justify-center rounded-md transition ${
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
            className="flex h-[46px] w-[46px] items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
          >
            <LogoutIcon />
          </button>
        </nav>

        <div
          className={`min-w-0 overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out ${
            isCompact
              ? "max-h-0 translate-y-[-6px] opacity-0"
              : "max-h-24 translate-y-0 opacity-100"
          }`}
        >
          <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
            Neuroplex
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
      </header>
    </div>
  );
}

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  if (icon === "user") {
    return (
      <svg
        aria-hidden="true"
        className="h-[23px] w-[23px]"
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
        className="h-[23px] w-[23px]"
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
        className="h-[23px] w-[23px]"
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

  if (icon === "cards") {
    return (
      <svg
        aria-hidden="true"
        className="h-[23px] w-[23px]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M4 7.5 14.5 4l4 12L8 19.5Z" />
        <path d="M8 6h12v13H9" />
        <path d="M8 11h7" />
        <path d="M8 15h5" />
      </svg>
    );
  }

  if (icon === "projects") {
    return (
      <svg
        aria-hidden="true"
        className="h-[23px] w-[23px]"
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

  if (icon === "quests") {
    return (
      <svg
        aria-hidden="true"
        className="h-[23px] w-[23px]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M9 6h11" />
        <path d="M9 12h11" />
        <path d="M9 18h11" />
        <path d="m4 6 1 1 2-2" />
        <path d="m4 12 1 1 2-2" />
        <path d="m4 18 1 1 2-2" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-[23px] w-[23px]"
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
      className="h-[23px] w-[23px]"
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
