import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Define Your Future Path",
  description: "Choose what you want to become or what skill you want to learn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
