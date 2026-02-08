import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism — Marketing Intelligence & Deck Generation",
  description:
    "Marketing intelligence hub — dashboard, ad performance decks, and Shopify analytics. Connect, analyze, generate, export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
