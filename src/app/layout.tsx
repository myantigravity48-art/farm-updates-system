import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeColorSync } from "@/components/theme-color-sync";
import { ThemeProvider } from "@/components/theme-provider";
import { LayoutOverflowGuard } from "@/components/layout-overflow-guard";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["300", "400"] });
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Farm updates system",
  description: "Farm work reminders and updates",
};

/**
 * Browser chrome starts on the dark --bg token. ThemeColorSync rewrites this
 * meta to the active theme, without a media attribute, so the in-app choice
 * wins over the system preference.
 */
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0A110D",
};

const themeColorScript = `(function(){try{var t=localStorage.getItem("theme");var c=t==="light"?"#F4F3EC":"#0A110D";var h=document.head;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");h.insertBefore(m,h.firstChild);}m.removeAttribute("media");m.setAttribute("content",c);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${geist.variable}`}>
      <body>
        <script
          id="theme-color-init"
          dangerouslySetInnerHTML={{ __html: themeColorScript }}
        />
        <ThemeProvider attribute="class" themes={["dark", "light"]} defaultTheme="dark" enableSystem={false}>
          <ThemeColorSync />
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === "development" ? <LayoutOverflowGuard /> : null}
      </body>
    </html>
  );
}
