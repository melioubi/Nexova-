import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexova — Consultoría de Talento",
  description:
    "Consultoría de RR.HH. y Adquisición de Talento con operaciones en Chile y Argentina. Conectamos organizaciones con profesionales excepcionales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
