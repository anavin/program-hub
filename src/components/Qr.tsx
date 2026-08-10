"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function Qr({ value, size = 132 }: { value: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2 })
      .then((u) => alive && setSrc(u))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR code" width={size} height={size} style={{ borderRadius: 8, background: "#fff", padding: 6 }} />;
}
