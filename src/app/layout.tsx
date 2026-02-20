import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HR Agencija',
  description: 'Interni sustav za upravljanje',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr" suppressHydrationWarning>
      {/* Ovdje definiramo da je pozadina siva u svijetlom, a VAŠA PLAVA u tamnom modu */}
      <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-brand-navy transition-colors duration-300`}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
