import { ChevronRight, ChevronDown, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DbTableInfo } from "@/services/database-connections/type/database-connection.type";
import { Panel } from "@/components/panel";

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
    <Panel className="overflow-hidden">
      <div
        className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/40"
        onClick={onToggle}
      >
        {table.columns?.length ? (
          expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <Database className="size-4 shrink-0 text-muted-foreground" />
        )}
        <p className="flex-1 truncate font-manrope text-xs font-bold text-foreground">
          {table.name}
        </p>
        <p className="shrink-0 text-[11px] text-muted-foreground">
          {[
            table.row_count !== undefined ? `${table.row_count} rows` : null,
            table.columns ? `${table.columns.length} cols` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {expanded && table.columns && table.columns.length > 0 && (
        <div className="space-y-1.5 border-t bg-muted/30 px-3 py-2 pl-9">
          {table.columns.map((col, i) => (
            <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-mono text-muted-foreground">{col.name}</span>
              <Badge variant="outline">{col.type}</Badge>
              {col.nullable === false && (
                <Badge variant="secondary">NOT NULL</Badge>
              )}
              {col.primary_key && (
                <Badge>PK</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
