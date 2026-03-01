import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'sonner';
import GlobalSearch from '@/components/GlobalSearch';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HR Agencija',
  description: 'Interni sustav za upravljanje',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="hr" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-brand-navy transition-colors duration-300`}>
        <ThemeProvider>
          {user ? (
            <div className="flex min-h-screen flex-col md:flex-row md:h-screen md:overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col md:h-screen md:overflow-hidden">
                <header className="shrink-0 bg-white dark:bg-[#05182d] border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 md:px-8 py-3 flex items-center justify-center transition-colors">
                  <GlobalSearch />
                </header>
                <main className="flex-1 p-4 sm:p-6 md:p-8 md:overflow-y-auto">
                  {children}
                </main>
              </div>
            </div>
          ) : (
            children
          )}
          <Toaster position="bottom-right" richColors theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
