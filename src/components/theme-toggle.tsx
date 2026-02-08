"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
      aria-label="Toggle theme"
    >
      {/* Sun icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth={2}
        stroke="currentColor"
        className={`h-4 w-4 transition-all duration-300 ${
          theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        }`}
        style={{ position: "absolute" }}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {/* Moon icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth={2}
        stroke="currentColor"
        className={`h-4 w-4 transition-all duration-300 ${
          theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
        style={{ position: "absolute" }}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
