import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_NAME } from "@cricket/shared";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans-src",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-src",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Cricket Club Management`,
  description: "Run your cricket club — members, teams, games, expenses, and payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-bg-base)] text-[var(--color-ink)]">
        {children}
      </body>
    </html>
  );
}
