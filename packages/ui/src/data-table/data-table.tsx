import * as React from "react";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "../cn.js";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Optional extra controls rendered next to the search box (facet filters, etc). */
  toolbar?: React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  rowCount,
  pagination,
  onPaginationChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  toolbar,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [showColumnPicker, setShowColumnPicker] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, pagination },
    manualPagination: true,
    rowCount,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      onPaginationChange(next);
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pageCount = Math.max(1, Math.ceil(rowCount / pagination.pageSize));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-full border border-border bg-card pl-10 pr-3.5 text-sm shadow-xs outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
        {toolbar}
        <div className="relative">
          <button
            type="button"
            aria-label="Toggle column visibility"
            onClick={() => setShowColumnPicker((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-secondary"
          >
            <SlidersHorizontal className="size-4" />
            Columns
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-border bg-popover p-2 shadow-md">
              {table
                .getAllLeafColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <label key={col.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                    />
                    {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
                  </label>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left font-medium text-muted-foreground"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        disabled={!header.column.getCanSort()}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1",
                          header.column.getCanSort() && "cursor-pointer select-none hover:text-foreground",
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          ({ asc: <ChevronUp className="size-3.5" />, desc: <ChevronDown className="size-3.5" /> }[
                            header.column.getIsSorted() as string
                          ] ?? <ChevronsUpDown className="size-3.5 opacity-40" />)}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-card">
            {isLoading ? (
              Array.from({ length: pagination.pageSize > 8 ? 8 : pagination.pageSize }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {rowCount === 0 ? "0 results" : `Page ${pagination.pageIndex + 1} of ${pageCount} · ${rowCount} results`}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={pagination.pageIndex === 0}
            onClick={() => table.previousPage()}
            className="rounded-md border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={pagination.pageIndex + 1 >= pageCount}
            onClick={() => table.nextPage()}
            className="rounded-md border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
