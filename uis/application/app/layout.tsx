import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proveedores | Nexova",
  description: "Directorio operativo de proveedores de Nexova",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}