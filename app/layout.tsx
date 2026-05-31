import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from "next/font/google";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';

const roboto = Roboto({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XIVGistPlan Sharelink Creator",
  description:
    "Handcrafted by a shitty programmer (and vibe-coded to hell and back by a shittier one)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
