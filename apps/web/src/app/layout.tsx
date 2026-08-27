import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Even Odds",
  description: "Settle the score online, at even odds",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full`}>
    <body className="h-full antialiased">{children}</body>
  </html>
);

export default RootLayout;
