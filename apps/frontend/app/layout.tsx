import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Draw - Lottery Management System",
  description: "Manage lottery events with QR codes and real-time draws",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}