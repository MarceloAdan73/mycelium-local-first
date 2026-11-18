import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { MatrixRain } from "@/components/MatrixRain";
import { Scanlines } from "@/components/Scanlines";
import { CursorGlow } from "@/components/CursorGlow";
import { GridBackground } from "@/components/GridBackground";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mycelium",
  description: "Editor de notas local-first. Sin passwords, sin servidores: todo vive en tu dispositivo.",
  applicationName: "Mycelium",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mycelium",
  },
  openGraph: {
    title: "Mycelium",
    description: "Editor de notas local-first. Sin passwords, sin servidores: todo vive en tu dispositivo.",
    type: "website",
    url: "https://mycelium.vercel.app",
    siteName: "Mycelium",
  },
};

export const viewport: Viewport = {
  themeColor: "#050508",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MatrixRain />
        <GridBackground />
        <CursorGlow />
        <Scanlines />
        <OfflineBanner />
        <ServiceWorkerRegister />
        <div className="relative z-10 flex-1 flex flex-col">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
