import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from 'next/font/google';
import ThemeRegistry from "./ThemeRegistry";

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: "XIVPlan Sharelink Creator",
  description: "Handcrafted by a shitty programmer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
