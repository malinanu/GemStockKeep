interface Props {
  svgContent: string;
  code: string;
  stoneType: string;
  weight: string;
}

export function QrLabel({ svgContent, code, stoneType, weight }: Props) {
  return (
    <div className="qr-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* svgContent is produced server-side by the `qrcode` package from a
          server-generated HMAC-signed token — it is never derived from user input. */}
      <div
        style={{ width: 140, height: 140 }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: '#10151c', marginTop: 10, letterSpacing: '0.04em' }}>{code}</div>
      <div style={{ fontSize: 11, color: '#6b7682', marginTop: 2 }}>{stoneType} · {weight} ct</div>
    </div>
  );
}
