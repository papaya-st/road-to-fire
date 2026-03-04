import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import { AppProvider } from "./context/AppContext";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "かけいぼ",
  description: "家族の家計管理アプリ",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "かけいぼ" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4F46E5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>
          <ServiceWorkerRegister />
          <div className="max-w-md mx-auto min-h-screen pb-28 relative">
            {children}
          </div>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
