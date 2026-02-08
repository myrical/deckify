import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deckify — Ad Performance Decks in Minutes",
  description:
    "Convert your Meta & Google Ads accounts into beautiful presentation decks. Connect, configure, generate, export.",
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
