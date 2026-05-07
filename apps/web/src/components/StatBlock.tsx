interface StatBlockProps {
  label: string;
  value: string | number;
  subValue?: string;
}

export default function StatBlock({ label, value, subValue }: StatBlockProps) {
  return (
    <div className="bg-background-elevated p-3 rounded border border-background-border">
      <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">
        {label}
      </div>
      <div className="text-lg font-mono text-text-primary font-bold">
        {value}
      </div>
      {subValue && (
        <div className="text-[10px] text-brand-orange-text font-mono mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
}
