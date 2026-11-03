import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./site.css";       // public website design system (Apple-style; classes used only by public pages).
                           // Loaded before globals.css so Tailwind utilities can override it.
import "./globals.css";
import "./dark-theme.css"; // dashboard dark mode (generated: scripts/gen-dark-theme.mjs)
import "./ai-theme.css";   // RISHI AI light/dark (generated: scripts/gen-ai-theme.mjs)
import "./glass-theme.css"; // dashboard Liquid Glass interface (hand-written; keyed on html.glass)
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Toaster } from "@/components/Toast";
import AuthProvider from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Self-hosted variable fonts (no network needed at build time).
const fraunces = localFont({
  src: [
    { path: "./fonts/Fraunces.woff2", style: "normal" },
    { path: "./fonts/Fraunces-Italic.woff2", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = localFont({
  src: [{ path: "./fonts/Inter.woff2", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

// Public website body type (app/site.css): Mukta, a warm humanist sans from
// Ek Type (Mumbai). Headlines use Anek Latin, loaded above.
const mukta = localFont({
  src: [
    { path: "./fonts/Mukta-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Mukta-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Mukta-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Mukta-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mukta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Project RISHI @ UC Berkeley | Promoting Sustainable Development",
    template: "%s | Project RISHI @ UC Berkeley",
  },
  description:
    "Project RISHI is a student-run non-profit promoting the sustainable development and growth of rural Indian communities.",
  openGraph: {
    title: "Project RISHI @ UC Berkeley",
    description:
      "Promoting the sustainable development and growth of rural Indian communities.",
    type: "website",
  },
};

// viewport-fit=cover lets the page draw under the notch and home indicator on
// iPhones; the --safe-* insets in globals.css keep everything tappable clear.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mukta.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply dashboard dark mode and the Liquid Glass interface (the default;
            "classic" opts out, RISHI AI is excluded — see components/GlassMode)
            before first paint, so neither flashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=location.pathname,c=document.documentElement.classList;if(p.indexOf("/dashboard")===0){if(localStorage.getItem("rishi:theme")==="dark")c.add("dark");if(p.indexOf("/dashboard/ask")!==0&&localStorage.getItem("rishi:ui")!=="classic")c.add("glass")}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <Navbar />
          <BackButton />
          <Toaster />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
