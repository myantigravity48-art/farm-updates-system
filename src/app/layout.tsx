import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import type { ReactNode } from "react";
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
