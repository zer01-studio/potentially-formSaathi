import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion/motion-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FormSaathi — forms, explained simply",
    template: "%s · FormSaathi",
  },
  description:
    "FormSaathi turns confusing forms into a calm conversation. Attach a PDF, photo, or link; answer one plain-language question at a time, by typing or talking; review your answers and generate a completed form.",
  applicationName: "FormSaathi",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3edde" },
    { media: "(prefers-color-scheme: dark)", color: "#081310" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} min-h-dvh font-sans antialiased`}
      >
        <ThemeProvider>
          <MotionProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
            >
              Skip to content
            </a>
            {children}
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
