import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./app.css";
import AmplifyProvider from "@/app/components/AmplifyProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WinniePro Remodeling",
  description: "Professional remodeling portfolio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
