import type { Metadata } from "next";
import { CurrentTaskOverlay } from "./current-task-overlay";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neuroplex",
  description: "Neuroplex login",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <CurrentTaskOverlay />
      </body>
    </html>
  );
}
