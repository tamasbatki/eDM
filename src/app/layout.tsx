import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata: Metadata = {
  title: "Financial Internal Builder",
  description: "Internal tool for chart, PDF, and HTML email generation",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/workflow", label: "Composer" },
  { href: "/charts", label: "Charts" },
  { href: "/ai", label: "AI" },
  { href: "/pdf", label: "PDF" },
  { href: "/email-builder", label: "Template Builder" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen px-4 py-4 md:px-6">
          <header className="app-shell sticky top-2 z-20 mx-auto max-w-7xl rounded-2xl border border-brand-mist/70 shadow-sm">
            <nav className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <Link href="/" className="mr-2 flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-brand-mist/60">
                <BrandLogo size={32} />
                <span className="text-sm font-semibold text-brand-navy">conDM Builder</span>
              </Link>

              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 font-semibold text-brand-navy transition hover:bg-brand-teal hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="mx-auto mt-5 max-w-7xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
