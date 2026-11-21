import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eramarindo AI Federation",
  description: "Human-governed multi-model collaboration workspace"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}