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

  const rows = table.getRowModel().rows
  return (
    <div className="w-full text-main-foreground">
      <div className="hidden min-[640px]:block">
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
            {rows?.length ? rows.map(row => (
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
      </div>
      <div className="min-[640px]:hidden flex flex-col gap-2">
        {rows?.length ? rows.map(row => (
          <div key={row.id} className="border-2 border-border rounded-base shadow-shadow bg-secondary-background text-foreground p-3 flex flex-col gap-1.5 text-sm">
            {row.getVisibleCells().map(cell => {
              const header = cell.column.columnDef.header
              const label = typeof header === 'string' ? header : ''
              return (
                <div key={cell.id} className="flex items-center justify-between gap-3">
                  {label && <span className="font-heading uppercase tracking-wider text-xs">{label}</span>}
                  <span className={label ? 'text-right' : 'ml-auto'}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                </div>
              )
            })}
          </div>
        )) : (
          <div className="border-2 border-border rounded-base p-4 text-center text-muted-foreground text-sm">No results.</div>
        )}
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 py-3">
          <Button variant="noShadow" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="noShadow" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      )}
    </div>
  )
}
