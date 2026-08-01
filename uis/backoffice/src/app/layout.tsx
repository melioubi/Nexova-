import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexova — Backoffice Interno",
  description: "Panel de gestión interna para consultores de Nexova",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full font-sans antialiased bg-gray-50">
        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
            <div className="p-6 border-b border-gray-800">
              <h1 className="text-xl font-bold">Nexova</h1>
              <p className="text-sm text-gray-400 mt-1">Backoffice Interno</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-nexova-600 text-white text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 text-sm font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Candidatos
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 text-sm font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Vacantes
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 text-sm font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Reportes
              </a>
            </nav>
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-nexova-600 flex items-center justify-center text-xs font-bold">
                  AS
                </div>
                <div className="text-sm">
                  <p className="font-medium">Andrés Silva</p>
                  <p className="text-gray-400 text-xs">CEO & Fundador</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-0">
            <header className="bg-white border-b border-gray-200 px-8 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            </header>
            <main className="flex-1 overflow-auto p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
