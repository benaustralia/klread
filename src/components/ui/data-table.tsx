"use client"

import { useState } from 'react'
import { type ColumnDef, type ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState, useReactTable, type VisibilityState } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumn?: string
  filterPlaceholder?: string
  pageSize?: number
}

export function DataTable<TData, TValue>({ columns, data, pageSize = 20 }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const table = useReactTable({
    data, columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    initialState: { pagination: { pageSize } },
    state: { sorting, columnFilters, columnVisibility },
  })

  return (
    <div className="w-full font-sans text-main-foreground">
      <Table>
        <TableHeader className="font-heading">
          {table.getHeaderGroups().map(hg => (
            <TableRow className="bg-secondary-background text-foreground" key={hg.id}>
              {hg.headers.map(h => (
                <TableHead className="text-foreground text-xs uppercase tracking-wider" key={h.id}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
            <TableRow className="bg-secondary-background text-foreground" key={row.id} data-state={row.getIsSelected() && 'selected'}>
              {row.getVisibleCells().map(cell => (
                <TableCell className="px-4 py-2 text-sm" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-16 text-center text-muted-foreground text-sm">No results.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 py-3">
          <Button variant="noShadow" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="noShadow" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      )}
    </div>
  )
}
