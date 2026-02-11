import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: "AI Career Tutor - Architect Your Future",
  description: "Personalized AI-powered career roadmaps with 100-step learning paths, skill assessments, and gamified progression. Transform your career ambitions into reality.",
  keywords: "career planning, AI tutor, learning roadmap, skill development, career coaching",
  authors: [{ name: "AI Career Tutor" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
