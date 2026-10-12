import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["300", "400"] });
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Farm updates system",
  description: "Farm work reminders and updates",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${geist.variable}`}>
      <body>
        <ThemeProvider attribute="class" themes={["dark", "light"]} defaultTheme="dark" enableSystem={false}>
          <Suspense fallback={<main className="min-h-screen bg-bg px-6 pt-9 text-text">{children}</main>}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
