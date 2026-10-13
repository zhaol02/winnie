import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@aws-amplify/ui-react/styles.css";
import AmplifyProvider from "@/app/components/AmplifyProvider";
import NavBar from "@/app/components/NavBar";

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
        <AmplifyProvider>
          <NavBar />
          {children}
        </AmplifyProvider>
      </body>
    </html>
  );
}
