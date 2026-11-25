import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { LayoutOverflowGuard } from "@/components/layout-overflow-guard";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["300", "400"] });
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Farm updates system",
  description: "Farm work reminders and updates",
};

/** Browser chrome colours come from the --bg token in globals.css. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EC" },
    { media: "(prefers-color-scheme: dark)", color: "#0A110D" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${geist.variable}`}>
      <body>
        <ThemeProvider attribute="class" themes={["dark", "light"]} defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === "development" ? <LayoutOverflowGuard /> : null}
      </body>
    </html>
  );
}
