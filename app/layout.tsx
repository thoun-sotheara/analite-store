import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { CatalogProvider } from "@/components/catalog/catalog-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { CurrencyProvider } from "@/components/currency/currency-provider";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";
import { CookieNotice } from "@/components/cookies/cookie-notice";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
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
  title: "Analite Kit | Premium Template Marketplace",
  description:
    "Professional template marketplace with secure delivery, KHQR checkout, vendor storefronts, and retention features.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSession = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <AuthSessionProvider initialSession={initialSession}>
          <CatalogProvider>
            <CartProvider>
              <WishlistProvider>
                <CurrencyProvider>
                  <SiteHeader />
                  {children}
                  <SiteFooter />
                  <CookieNotice />
                </CurrencyProvider>
              </WishlistProvider>
            </CartProvider>
          </CatalogProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
