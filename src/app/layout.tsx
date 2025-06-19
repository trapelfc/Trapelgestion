
'use client'; // Required for usePathname

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { siteConfig } from '@/config/site';
import { AuthProvider } from '@/context/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { usePathname } from 'next/navigation'; // Import usePathname

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// export const metadata: Metadata = { // Metadata cannot be used in a client component
//   title: siteConfig.name,
//   description: siteConfig.description,
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="fr">
      <head>
        {/* It's better to set title and meta tags here if layout is a client component */}
        <title>{siteConfig.name}</title>
        <meta name="description" content={siteConfig.description} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <AuthGuard>
              {!isLoginPage && <Header />}
              <main className="flex-1">{children}</main>
              {!isLoginPage && <Footer />}
            </AuthGuard>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
