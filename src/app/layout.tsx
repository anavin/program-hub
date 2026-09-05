import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Parfumo — Program Hub",
  description: "ศูนย์รวมโปรแกรมทั้งหมดของ Lab Parfumo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* ฟอนต์ไทย Sarabun — คลีน อ่านง่าย */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* ตั้งธีม + ขนาดตัวอักษร ก่อน paint กันจอกระพริบ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('hub-theme');if(t)document.documentElement.setAttribute('data-theme',t);var f=localStorage.getItem('hub-fontscale');if(f)document.documentElement.style.zoom=f;}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
