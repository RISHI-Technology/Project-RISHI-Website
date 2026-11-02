"use client";

import Link from "next/link";

/**
 * Gear icon that links to the account settings page. On hover the gear rotates
 * a little clockwise and the words "account settings" slide into view.
 */
export default function SettingsGear({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/dashboard/settings"
      aria-label="Account settings"
      data-glass="clear"
      className={`group inline-flex items-center gap-2 rounded-full border border-paper/30 py-2 pl-2.5 pr-2.5 text-paper transition-colors hover:bg-paper/10 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-[22deg]"
      >
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 13c.04-.33.06-.66.06-1s-.02-.67-.06-1l2-1.57a.5.5 0 0 0 .12-.64l-1.9-3.28a.5.5 0 0 0-.6-.22l-2.36.95a7.3 7.3 0 0 0-1.73-1l-.36-2.5a.5.5 0 0 0-.5-.42h-3.8a.5.5 0 0 0-.5.42l-.36 2.5c-.62.25-1.2.59-1.73 1l-2.36-.95a.5.5 0 0 0-.6.22l-1.9 3.28a.5.5 0 0 0 .12.64L4.6 11c-.04.33-.06.66-.06 1s.02.67.06 1l-2 1.57a.5.5 0 0 0-.12.64l1.9 3.28a.5.5 0 0 0 .6.22l2.36-.95c.53.41 1.11.75 1.73 1l.36 2.5a.5.5 0 0 0 .5.42h3.8a.5.5 0 0 0 .5-.42l.36-2.5c.62-.25 1.2-.59 1.73-1l2.36.95a.5.5 0 0 0 .6-.22l1.9-3.28a.5.5 0 0 0-.12-.64L19.4 13Z" />
      </svg>
      <span className="grid grid-cols-[0fr] overflow-hidden text-sm font-semibold transition-[grid-template-columns] duration-300 ease-out group-hover:grid-cols-[1fr]">
        <span className="min-w-0 whitespace-nowrap pr-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Account settings
        </span>
      </span>
    </Link>
  );
}
