'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PrintVideoQrProps {
  url: string;
  title: string;
}

export function PrintVideoQr({ url, title }: PrintVideoQrProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) {
    return (
      <div className="flex h-24 w-24 items-center justify-center border border-slate-300 text-center text-[7pt] text-slate-500">
        QR indisponivel
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code para o video ${title}`}
      className="m-0 h-24 w-24 border border-slate-300 object-contain"
    />
  );
}
