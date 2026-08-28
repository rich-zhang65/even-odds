import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
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
  <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full`}>
    <body className="h-full antialiased">{children}</body>
  </html>
);

export default RootLayout;
