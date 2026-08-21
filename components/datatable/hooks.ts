import { useState, useCallback, useRef, useEffect } from "react";
import type {
  VisibilityState,
  ColumnOrderState,
  ColumnSizingState,
  ColumnPinningState,
  RowSelectionState,
  ExpandedState,
  SortingState
} from "@tanstack/react-table";
import type { SortAndPagination, TablePersistence } from "./types";

const DEFAULT_KEYS: Required<TablePersistence> = {
  visibilityKey: "datatable-column-visibility",
  orderKey: "datatable-column-order",
  sizingKey: "datatable-column-sizing",
  pinningKey: "datatable-column-pinning"
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`Failed to save to localStorage: ${key}`);
  }
}

export function useColumnVisibility(persistenceKey?: string) {
  const key = persistenceKey || DEFAULT_KEYS.visibilityKey;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => loadFromStorage(key, {})
  );

  const handleVisibilityChange = useCallback(
    (
      updaterOrValue:
        | VisibilityState
        | ((prev: VisibilityState) => VisibilityState)
    ) => {
      setColumnVisibility((prev) => {
        const newValue =
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev)
            : updaterOrValue;
        saveToStorage(key, newValue);
        return newValue;
      });
    },
    [key]
  );

  const resetVisibility = useCallback(() => {
    handleVisibilityChange({});
  }, [handleVisibilityChange]);

  return {
    columnVisibility,
    setColumnVisibility: handleVisibilityChange,
    resetVisibility
  };
}

export function useColumnOrder(persistenceKey?: string) {
  const key = persistenceKey || DEFAULT_KEYS.orderKey;
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    loadFromStorage(key, [])
  );

  const handleOrderChange = useCallback(
    (
      updaterOrValue:
        | ColumnOrderState
        | ((prev: ColumnOrderState) => ColumnOrderState)
    ) => {
      setColumnOrder((prev) => {
        const newValue =
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev)
            : updaterOrValue;

        const systemColumns = ["select", "actions"];
        const filteredOrder = newValue.filter(
          (col) => !systemColumns.includes(col)
        );
        const hasSelect = newValue.includes("select");
        const hasActions = newValue.includes("actions");

        saveToStorage(key, filteredOrder);

        const finalOrder: ColumnOrderState = [];
        if (hasSelect) finalOrder.push("select");
        finalOrder.push(...filteredOrder);
        if (hasActions) finalOrder.push("actions");

        return newValue;
      });
    },
    [key]
  );

  const resetOrder = useCallback(() => {
    handleOrderChange([]);
    localStorage.removeItem(key);
  }, [handleOrderChange, key]);

  return {
    columnOrder,
    setColumnOrder: handleOrderChange,
    resetOrder
  };
}

export function useColumnSizing(persistenceKey?: string) {
  const key = persistenceKey || DEFAULT_KEYS.sizingKey;
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadFromStorage(key, {})
  );

  const handleSizingChange = useCallback(
    (
      updaterOrValue:
        | ColumnSizingState
        | ((prev: ColumnSizingState) => ColumnSizingState)
    ) => {
      setColumnSizing((prev) => {
        const newValue =
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev)
            : updaterOrValue;
        saveToStorage(key, newValue);
        return newValue;
      });
    },
    [key]
  );

  const resetSizing = useCallback(() => {
    handleSizingChange({});
  }, [handleSizingChange]);

  return {
    columnSizing,
    setColumnSizing: handleSizingChange,
    resetSizing
  };
}

export function useColumnPinning(persistenceKey?: string) {
  const key = persistenceKey || DEFAULT_KEYS.pinningKey;
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    loadFromStorage(key, { left: [], right: [] })
  );

  const handlePinningChange = useCallback(
    (
      updaterOrValue:
        | ColumnPinningState
        | ((prev: ColumnPinningState) => ColumnPinningState)
    ) => {
      setColumnPinning((prev) => {
        const newValue =
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev)
            : updaterOrValue;
        saveToStorage(key, newValue);
        return newValue;
      });
    },
    [key]
  );

  const resetPinning = useCallback(() => {
    handlePinningChange({ left: [], right: [] });
  }, [handlePinningChange]);

  return {
    columnPinning,
    setColumnPinning: handlePinningChange,
    resetPinning
  };
}

export function usePagination(defaultPageSize = 10) {
  const [pagination, setPagination] = useState<SortAndPagination>({
    page: 1,
    pageSize: defaultPageSize,
    sortBy: null,
    orderBy: null
  });

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSort = useCallback(
    (sortBy: string | null, orderBy: "asc" | "desc" | null) => {
      setPagination((prev) => ({ ...prev, sortBy, orderBy }));
    },
    []
  );

  const nextPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const resetPagination = useCallback(() => {
    setPagination({
      page: 1,
      pageSize: defaultPageSize,
      sortBy: null,
      orderBy: null
    });
  }, [defaultPageSize]);

  return {
    pagination,
    setPagination,
    setPage,
    setPageSize,
    setSort,
    nextPage,
    prevPage,
    resetPagination
  };
}

export function useRowSelection(onSelectionChange?: (rows: any[]) => void) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const tableRef = useRef<any>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const previousSelectionRef = useRef<string>("");

  // Keep callback ref updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Call onSelectionChange after state update, but only if selection actually changed
  useEffect(() => {
    const currentSelectionKey = JSON.stringify(rowSelection);
    if (
      onSelectionChangeRef.current &&
      tableRef.current &&
      previousSelectionRef.current !== currentSelectionKey
    ) {
      previousSelectionRef.current = currentSelectionKey;
      const selectedRows = Object.keys(rowSelection)
        .filter((key) => rowSelection[key])
        .map((key) => tableRef.current.getRow(key))
        .filter(Boolean);
      onSelectionChangeRef.current(selectedRows);
    }
  }, [rowSelection]);

  const handleSelectionChange = useCallback(
    (
      updaterOrValue:
        | RowSelectionState
        | ((prev: RowSelectionState) => RowSelectionState),
      table?: any
    ) => {
      if (table) {
        tableRef.current = table;
      }
      setRowSelection(
        typeof updaterOrValue === "function"
          ? updaterOrValue
          : () => updaterOrValue
      );
    },
    []
  );

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const selectAll = useCallback(
    (table: any) => {
      const allRowIds = table
        .getRowModel()
        .rows.reduce((acc: RowSelectionState, row: any) => {
          acc[row.id] = true;
          return acc;
        }, {} as RowSelectionState);
      handleSelectionChange(allRowIds, table);
    },
    [handleSelectionChange]
  );

  return {
    rowSelection,
    setRowSelection: handleSelectionChange,
    clearSelection,
    selectAll
  };
}

export function useExpandedRows() {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const toggleAll = useCallback((isExpanded: boolean) => {
    setExpanded(isExpanded ? true : {});
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded({});
  }, []);

  return {
    expanded,
    setExpanded,
    toggleAll,
    collapseAll
  };
}

export function useSorting(defaultSorting: SortingState = []) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);

  const toggleSort = useCallback((columnId: string) => {
    setSorting((prev) => {
      const existing = prev.find((s) => s.id === columnId);
      if (!existing) {
        return [{ id: columnId, desc: false }];
      }
      if (!existing.desc) {
        return [{ id: columnId, desc: true }];
      }
      return [];
    });
  }, []);

  const clearSort = useCallback(() => {
    setSorting([]);
  }, []);

  return {
    sorting,
    setSorting,
    toggleSort,
    clearSort
  };
}

export function useTableState(options: {
  persistence?: TablePersistence;
  defaultPageSize?: number;
  defaultSorting?: SortingState;
  onSelectionChange?: (rows: any[]) => void;
}) {
  const {
    persistence,
    defaultPageSize = 10,
    defaultSorting = [],
    onSelectionChange
  } = options;

  const visibility = useColumnVisibility(persistence?.visibilityKey);
  const order = useColumnOrder(persistence?.orderKey);
  const sizing = useColumnSizing(persistence?.sizingKey);
  const pinning = useColumnPinning(persistence?.pinningKey);
  const paginationState = usePagination(defaultPageSize);
  const selection = useRowSelection(onSelectionChange);
  const expandedState = useExpandedRows();
  const sortingState = useSorting(defaultSorting);

  const resetAll = useCallback(() => {
    visibility.resetVisibility();
    order.resetOrder();
    sizing.resetSizing();
    pinning.resetPinning();
    paginationState.resetPagination();
    selection.clearSelection();
    expandedState.collapseAll();
    sortingState.clearSort();
  }, [
    visibility,
    order,
    sizing,
    pinning,
    paginationState,
    selection,
    expandedState,
    sortingState
  ]);

  const prevDefaultSortingRef = useRef(defaultSorting);

  useEffect(() => {
    const prev = prevDefaultSortingRef.current;
    const wasEmpty = !prev || prev.length === 0;
    const isNowEmpty = !defaultSorting || defaultSorting.length === 0;

    if (wasEmpty !== isNowEmpty) {
      sortingState.setSorting(defaultSorting ?? []);
    }

    prevDefaultSortingRef.current = defaultSorting;
  }, [JSON.stringify(defaultSorting)]);

  return {
    // Column states
    columnVisibility: visibility.columnVisibility,
    setColumnVisibility: visibility.setColumnVisibility,
    columnOrder: order.columnOrder,
    setColumnOrder: order.setColumnOrder,
    columnSizing: sizing.columnSizing,
    setColumnSizing: sizing.setColumnSizing,
    columnPinning: pinning.columnPinning,
    setColumnPinning: pinning.setColumnPinning,

    // Pagination
    pagination: paginationState.pagination,
    setPagination: paginationState.setPagination,
    setPage: paginationState.setPage,
    setPageSize: paginationState.setPageSize,
    setSort: paginationState.setSort,
    nextPage: paginationState.nextPage,
    prevPage: paginationState.prevPage,

    // Selection
    rowSelection: selection.rowSelection,
    setRowSelection: selection.setRowSelection,
    clearSelection: selection.clearSelection,

    // Expanded
    expanded: expandedState.expanded,
    setExpanded: expandedState.setExpanded,
    toggleAllExpanded: expandedState.toggleAll,

    // Sorting
    sorting: sortingState.sorting,
    setSorting: sortingState.setSorting,
    toggleSort: sortingState.toggleSort,

    // Reset
    resetAll
  };
}
