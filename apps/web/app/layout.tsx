import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/query-provider"; // Import QueryProvider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Finance App",
  description: "Manage your finances, tasks, and investments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>
        <QueryProvider> {/* Use QueryProvider */}
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
