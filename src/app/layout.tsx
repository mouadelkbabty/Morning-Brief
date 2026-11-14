import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Nav } from "@/components/nav";
import { RegisterServiceWorker } from "@/components/register-sw";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  // Installation sur iPhone : plein écran, barre d'état fondue dans l'app.
  appleWebApp: { capable: true, title: SITE.shortName, statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "dark",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <div className="dawn" aria-hidden />
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-28 sm:px-6 sm:pt-10 sm:pb-16">
          {children}
        </main>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
