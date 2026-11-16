import type { Metadata } from "next";
import "./globals.css";
import { TelemetryProvider } from "@/components/telemetry-provider";

export const metadata: Metadata = {
  title: "Nexova Backoffice",
  description: "Panel interno de Nexova",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>
        <TelemetryProvider />
        {children}
      </body>
    </html>
  );
}
