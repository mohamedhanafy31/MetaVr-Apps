import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import { inter, jetbrainsMono } from "./fonts";

// Fonts are loaded from ./fonts.ts
// - Primary: Inter and JetBrains Mono (if downloaded during build)
// - Fallback: System fonts (if primary fonts are not available)

export const metadata: Metadata = {
  title: "MetaVR Management Dashboard",
  description: "Centralized platform for managing VR applications and user access",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
