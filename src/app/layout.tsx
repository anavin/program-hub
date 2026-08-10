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
        {/* ตั้งธีมก่อน paint กันจอกระพริบ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('hub-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
