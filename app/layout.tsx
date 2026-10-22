import type { Metadata } from "next";
import "./globals.css";
import { bootstrapAdminIfNeeded } from "@/lib/auth";

// Run once per cold start
bootstrapAdminIfNeeded().catch(() => {});

export const metadata: Metadata = {
  title: "Docu-Chat — Self-hosted AI support bot",
  description: "Upload your docs, get an embeddable AI chat widget for your Gumroad / Lemon Squeezy shop.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
