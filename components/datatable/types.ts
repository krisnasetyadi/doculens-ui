import type {
  ColumnDef as TanstackColumnDef,
  Row,
  Table,
  SortingState
} from "@tanstack/react-table";

import type { ReactNode } from "react";

// Re-export Table type for external use
export type { Table } from "@tanstack/react-table";

export type ColumnDef<TData, TValue = unknown> = TanstackColumnDef<
  TData,
  TValue
> & {
  /** Column data type for editing */
  type?: string | number;
  /** Attribute name for API updates */
  attribute?: string;
  /** Reference table for foreign key lookups */
  referenceTable?: string;
  /** Whether the column is editable */
  editable?: boolean;
  /** Custom render configuration */
  render?: {
    type?: string;
    [key: string]: any;
  };
  /** Static options for select/multiselect columns */
  options?: { label: string; value: string | number }[];
};

export interface QueryResult<TData> {
  data: TData[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface SortAndPagination {
  page: number;
  pageSize: number;
  sortBy: string | null;
  orderBy: "asc" | "desc" | null;
}

export type ApiHandler<TResponse> = (params: any) => {
  name: string;
  handle: () => Promise<TResponse>;
};

export interface ActionItem {
  title: string;
  icon?: ReactNode;
  onClick?: (row: any) => void;
  href?: string | ((row: any) => string);
  separator?: boolean;
  disabled?: boolean | ((row: any) => boolean);
  hidden?: boolean | ((row: any) => boolean);
  className?: string;
}

export interface TableFeatures {
  /** Enable row selection with checkboxes */
  enableSelection?: boolean;
  /** Enable drag and drop row reordering */
  enableRowDragAndDrop?: boolean;
  /** Enable drag and drop column reordering directly from header */
  enableColumnDragAndDrop?: boolean;
  /** Enable column pinning (left/right) */
  enablePinning?: boolean;
  /** Enable column resizing */
  enableResizing?: boolean;
  /** Enable column reordering via settings popover */
  enableColumnReorder?: boolean;
  /** Enable inline cell editing */
  enableEditing?: boolean;
  /** Enable expandable sub-rows */
  enableExpanding?: boolean;
  /** Enable sorting */
  enableSorting?: boolean;
  /** Enable pagination */
  enablePagination?: boolean;
}

export interface TablePersistence {
  /** LocalStorage key for column visibility */
  visibilityKey?: string;
  /** LocalStorage key for column order */
  orderKey?: string;
  /** LocalStorage key for column sizing */
  sizingKey?: string;
  /** LocalStorage key for column pinning */
  pinningKey?: string;
}

export interface DataTableProps<TData, TResponse extends QueryResult<TData>> {
  /** API handler for fetching data */
  api: ApiHandler<TResponse>;
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Additional filter parameters for API */
  filterParams?: Record<string, any>;
  /** Table title */
  title?: string;
  /** Custom actions for the table header */
  tableActions?: ReactNode;
  /** Custom actions for each row */
  actionItems?: ActionItem[];
  /** Custom action column cell renderer */
  actionColumnCell?: (props: { row: Row<TData> }) => ReactNode;
  /** Custom header actions per column */
  headerActions?: (columnId: string) => ReactNode;
  /** Callback for refetch function */
  onRefetch?: (refetch: () => void) => void;
  /** Callback when data has been loaded (e.g. to read total for badge/empty state without extra request) */
  onDataLoaded?: (response: TResponse) => void;
  /**
   * Callback when the fetch fails, so a page can render its own error state with
   * a retry. Purely additive: the API layer still shows its error toast, and a
   * table without this prop behaves exactly as before (no rows, empty state).
   * `error` is null once a later attempt succeeds.
   */
  onError?: (error: unknown) => void;
  /** Callback for invalidate function - more reliable than refetch for triggering data refresh */
  onInvalidate?: (invalidate: () => void) => void;
  /** Callback to expose table instance for external control */
  onTableReady?: (table: Table<TData>) => void;
  /** Callback when row selection changes */
  onSelectionChange?: (rows: Row<TData>[]) => void;
  /** Callback for cell value edit */
  onEditValue?: (
    value: any,
    id: any,
    callback: () => void,
    row?: Row<TData>
  ) => void;
  /** Callback when row order changes via drag and drop */
  onRowOrderChange?: (
    oldIndex: number,
    newIndex: number,
    pagination: SortAndPagination | any,
    data: TData[],
    selectedIds?: (string | number)[]
  ) => void;
  /** Callback for action button click */
  onActionClick?: (id: number | string) => void;
  /** Callback for adding sub-row */
  onAddSubRow?: (row: Row<TData>) => void;
  /** Callback for foreign key search - fetches options for foreign key dropdown */
  onForeignKeySearch?: (
    referenceTable: string,
    search: string,
    callback: (options: { label: string; value: string | number }[]) => void
  ) => void;
  /** Key for nested sub-rows data */
  subRowKey?: keyof TData;
  /** Key for row identifier */
  identifierKey?: keyof TData;
  /** Table feature toggles */
  features?: TableFeatures;
  /** Persistence configuration */
  persistence?: TablePersistence;
  /** Available page size options */
  pageSizes?: number[];
  /** Default sorting initialized to the table */
  defaultSorting?: SortingState;
  /** Default page size */
  defaultPageSize?: number;
  /** Loading state override */
  isLoading?: boolean;
  /** Custom empty state */
  emptyState?: string | ReactNode;
  /** Custom className for table container */
  className?: string;
  /** Override the query staleTime (ms). Defaults to 5 min; pass 0 for live-search tables. */
  staleTime?: number;
}

export interface DataTableStaticProps<TData> {
  /** Static data array */
  data: TData[];
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Custom actions for each row */
  actionItems?: ActionItem[];
  /** Custom action column cell renderer */
  actionColumnCell?: (props: { row: Row<TData> }) => ReactNode;
  /** Callback to expose table instance for external control */
  onTableReady?: (table: Table<TData>) => void;
  /** Callback when row selection changes */
  onSelectionChange?: (rows: Row<TData>[]) => void;
  /** Callback for cell value edit */
  onEditValue?: (
    value: any,
    id: any,
    callback: () => void,
    row?: Row<TData>
  ) => void;
  /** Callback when row order changes via drag and drop */
  onRowOrderChange?: (oldIndex: number, newIndex: number) => void;
  /** Key for nested sub-rows data */
  subRowKey?: keyof TData;
  /** Key for row identifier */
  identifierKey?: keyof TData;
  /** Table feature toggles */
  features?: TableFeatures;
  /** Persistence configuration */
  persistence?: TablePersistence;
  /** Available page size options */
  pageSizes?: number[];
  /** Default sorting initialized to the table */
  defaultSorting?: SortingState;
  /** Default page size */
  defaultPageSize?: number;
  /** Show loading state */
  isLoading?: boolean;
  /** Custom empty state */
  emptyState?: string | ReactNode;
  /** Custom className for table container */
  className?: string;
  /** Optional per-row className derived from the row's data (e.g. status-based row coloring). */
  rowClassName?: (row: TData) => string;
}

export interface TableState {
  page: number;
  pageSize: number;
  sortBy: string | null;
  orderBy: "asc" | "desc" | null;
}

export interface EditingCell {
  rowIndex: number;
  columnId: string;
}
