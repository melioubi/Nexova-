"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Inicio", href: "#hero" },
  { label: "Servicios", href: "#servicios" },
  { label: "Metodología", href: "#metodologia" },
  { label: "Equipo", href: "#equipo" },
  { label: "Contacto", href: "#contacto" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-9 h-9 text-nexova-600" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect width="40" height="40" rx="8" fill="currentColor" fillOpacity="0.1"/>
              <path d="M10 28V12h4.5l5.5 9.5L25.5 12H30v16h-3.5V18l-5.5 9.5h-2L13.5 18v10H10z" fill="currentColor"/>
            </svg>
            <span className="text-xl font-bold text-nexova-900 tracking-tight">Nexova</span>
            <span className="hidden sm:inline text-sm text-gray-500 border-l border-gray-300 pl-3">
              Consultoría de Talento
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-nexova-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#contacto"
              className="bg-nexova-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-nexova-700 transition-colors"
            >
              Solicitar asesoría
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-nexova-600"
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-100 pt-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-gray-600 hover:text-nexova-600 transition-colors px-2 py-1"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#contacto"
              onClick={() => setMobileOpen(false)}
              className="bg-nexova-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-nexova-700 transition-colors text-center"
            >
              Solicitar asesoría
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}