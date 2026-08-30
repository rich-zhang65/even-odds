import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Even Odds",
  description: "Settle the score online, at even odds",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  // The boot script writes data-theme onto this element before React hydrates,
  // which is exactly the mismatch suppressHydrationWarning is for.
  <html
    className={`${fredoka.variable} ${nunito.variable} h-full`}
    lang="en"
    suppressHydrationWarning
  >
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
    </head>
    <body className="h-full antialiased">{children}</body>
  </html>
);

export default RootLayout;
