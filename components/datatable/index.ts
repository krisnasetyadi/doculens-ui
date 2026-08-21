// Main Components
//
// Only the static (in-memory array) variant is ported. The boilerplate's
// query-backed `DataTable` fetches through its own `useGetData`/`@tanstack/
// react-query` API-handler layer (`api: { name, handle }`), which is
// boilerplate-app-specific infrastructure with no chat-ui equivalent — it
// isn't something a file copy can port faithfully, it would need chat-ui's
// own data-fetching design. Every table in this app can be built on
// DataTableStatic (fetch the data however you like, then hand the array in).
export { DataTableStatic } from "./data-table-static";

// Subcomponents
export { DataTableHeader } from "./components/table-header";

export { DataTableBody } from "./components/table-body";

export {
  DataTablePagination,
  CompactPagination
} from "./components/table-pagination";

export {
  ColumnSettings,
  ColumnVisibilityDropdown
} from "./components/column-settings";

export { ActionCell, InlineActions } from "./components/action-cell";

// Editable Cell Components
export { EditableCell, CellDataType } from "./components/editable-cell";
export {
  BulkEditingBar,
  type BulkEditColumn
} from "./components/bulk-editing-bar";

// Types
export type {
  ColumnDef,
  ActionItem,
  SortAndPagination,
  TableFeatures,
  TablePersistence,
  DataTableStaticProps,
  QueryResult,
  ApiHandler,
  TableState,
  EditingCell,
  Table
} from "./types";

// Hooks
export { useTableState, usePagination, useRowSelection } from "./hooks";

// Utils
export {
  getPageNumbers,
  getTotalColumnsCount,
  getVisibleColumnsCount,
  getValueByPath,
  getPinningStyles,
  getResizeHandleStyles,
  reorderColumns,
  copyToClipboard,
  flattenSubRows,
  getRowClassName,
  getCellClassName,
  calculateMinColumnWidth,
  calculateMinColumnWidthFromData,
  DEFAULT_COLUMN_CONFIG,
  SYSTEM_COLUMN_IDS
} from "./utils";
