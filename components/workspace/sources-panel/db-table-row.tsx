import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DbTableInfo } from "@/services";

export function DbTableRow({
  table,
  expanded,
  onToggle,
}: {
  table: DbTableInfo;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl bg-card border border-border/60 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {table.columns?.length ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="material-symbols-outlined text-muted-foreground shrink-0" style={{ fontSize: 16 }}>database</span>
        )}
        <p className="text-sm font-bold font-['Manrope'] text-foreground flex-1 truncate">
          {table.name}
        </p>
        <p className="text-[11px] text-muted-foreground/60 font-['Inter'] shrink-0">
          {[
            table.row_count !== undefined ? `${table.row_count} rows` : null,
            table.columns ? `${table.columns.length} cols` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {expanded && table.columns && table.columns.length > 0 && (
        <div className="border-t border-border/60 px-4 py-2 pl-11 space-y-1.5 bg-muted/20">
          {table.columns.map((col, i) => (
            <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-mono text-muted-foreground">{col.name}</span>
              <Badge variant="outline" className="rounded-full text-[10px] px-1 py-0">{col.type}</Badge>
              {col.nullable === false && (
                <Badge variant="secondary" className="rounded-full text-[10px] px-1 py-0">NOT NULL</Badge>
              )}
              {col.primary_key && (
                <Badge className="rounded-full text-[10px] px-1 py-0 bg-primary text-primary-foreground">PK</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
