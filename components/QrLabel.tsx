interface Props {
  svgContent: string;
  code: string;
  stoneType: string;
  weight: string;
}

export function QrLabel({ svgContent, code, stoneType, weight }: Props) {
  return (
    <div className="border rounded-2xl p-4 flex gap-4 items-start bg-white w-fit">
      {/* svgContent is produced server-side by the `qrcode` package and is
          never derived from user input, so XSS risk does not apply here. */}
      <div
        className="w-24 h-24 flex-shrink-0"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <div className="space-y-0.5">
        <div className="font-mono font-bold text-lg">{code}</div>
        <div className="text-sm text-slate-600">{stoneType}</div>
        <div className="text-sm text-slate-500">{weight} ct</div>
      </div>
    </div>
  );
}
