import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { DateFilterProvider } from '@/context/DateFilterContext';
import { Navbar } from '@/components/Navbar';
import { PullToRefresh } from '@/components/common/PullToRefresh';

export const metadata: Metadata = {
  title: 'Hệ Thống Quản Lý Quán Cà Phê | POS & Dashboard',
  description: 'Web app quản lý quán cà phê hiện đại với POS cho nhân viên và Dashboard quản trị cho chủ quán',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#d97706',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <DateFilterProvider>
              <PullToRefresh />
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 flex flex-col">{children}</main>
              </div>
            </DateFilterProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

