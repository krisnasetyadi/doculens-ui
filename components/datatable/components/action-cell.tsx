import { Fragment } from "react"
import Link from "next/link"
import type { Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"
import type { ActionItem } from "../types"

interface ActionCellProps<TData> {
  row: Row<TData>
  actions: ActionItem[]
  identifierKey?: keyof TData
}

export function ActionCell<TData>({
  row,
  actions,
  identifierKey: _identifierKey,
}: ActionCellProps<TData>) {
  const rowData = row.original

  const getHref = (action: ActionItem): string | undefined => {
    if (!action.href) return undefined
    if (typeof action.href === "function") {
      return action.href(rowData)
    }
    return action.href
  }

  const isDisabled = (action: ActionItem): boolean => {
    if (typeof action.disabled === "function") {
      return action.disabled(rowData)
    }
    return action.disabled ?? false
  }

  const isHidden = (action: ActionItem): boolean => {
    if (typeof action.hidden === "function") {
      return action.hidden(rowData)
    }
    return action.hidden ?? false
  }

  const visibleActions = actions.filter((action) => !isHidden(action))

  if (visibleActions.length === 0) {
    return null
  }

  if (visibleActions.length === 1) {
    const action = visibleActions[0]
    const href = getHref(action)
    const disabled = isDisabled(action)

    if (href) {
      return (
        <div className="flex items-center justify-center">
          <Button
            asChild
            variant="default"
            size="icon-sm"
            disabled={disabled}
            className={cn("h-8 w-8 rounded", action.className)}
          >
            <Link href={href}>{action.icon || action.title.charAt(0)}</Link>
          </Button>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center">
        <Button
          variant="default"
          size="icon-sm"
          onClick={() => action.onClick?.(rowData)}
          disabled={disabled}
          className={cn("h-8 w-8 rounded", action.className)}
        >
          {action.icon || action.title.charAt(0)}
        </Button>
      </div>
    )
  }

  // More than 1 action - show dropdown with three dots
  return (
    <div className="flex items-center justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="icon-sm" className="h-8 w-8 rounded">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {visibleActions.map((action, index) => {
            const href = getHref(action)
            const disabled = isDisabled(action)

            if (href) {
              return (
                <Fragment key={`action-${index}`}>
                  <DropdownMenuItem asChild disabled={disabled} className="cursor-pointer">
                    <Link href={href}>
                      {action.icon && (
                        <span className="mr-2">{action.icon}</span>
                      )}
                      {action.title}
                    </Link>
                  </DropdownMenuItem>
                  {action.separator && <DropdownMenuSeparator />}
                </Fragment>
              )
            }

            return (
              <Fragment key={`action-${index}`}>
                <DropdownMenuItem
                  onClick={() => action.onClick?.(rowData)}
                  disabled={disabled}
                  className="cursor-pointer"
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.title}
                </DropdownMenuItem>
                {action.separator && <DropdownMenuSeparator />}
              </Fragment>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface InlineActionsProps<TData> {
  row: Row<TData>
  actions: ActionItem[]
  maxVisible?: number
}

export function InlineActions<TData>({
  row,
  actions,
  maxVisible = 2,
}: InlineActionsProps<TData>) {
  const rowData = row.original

  const isDisabled = (action: ActionItem): boolean => {
    if (typeof action.disabled === "function") {
      return action.disabled(rowData)
    }
    return action.disabled ?? false
  }

  const isHidden = (action: ActionItem): boolean => {
    if (typeof action.hidden === "function") {
      return action.hidden(rowData)
    }
    return action.hidden ?? false
  }

  const getHref = (action: ActionItem): string | undefined => {
    if (!action.href) return undefined
    if (typeof action.href === "function") {
      return action.href(rowData)
    }
    return action.href
  }

  const visibleActions = actions.filter((action) => !isHidden(action))
  const displayedActions = visibleActions.slice(0, maxVisible)
  const overflowActions = visibleActions.slice(maxVisible)

  return (
    <div className="flex items-center gap-1">
      {displayedActions.map((action, index) => {
        const href = getHref(action)
        const disabled = isDisabled(action)

        if (href) {
          return (
            <Button
              key={`inline-action-${index}`}
              asChild
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              className="h-8 w-8"
            >
              <Link href={href}>{action.icon || action.title.charAt(0)}</Link>
            </Button>
          )
        }

        return (
          <Button
            key={`inline-action-${index}`}
            variant="ghost"
            size="icon-sm"
            onClick={() => action.onClick?.(rowData)}
            disabled={disabled}
            className="h-8 w-8"
          >
            {action.icon || action.title.charAt(0)}
          </Button>
        )
      })}

      {overflowActions.length > 0 && (
        <ActionCell row={row} actions={overflowActions} />
      )}
    </div>
  )
}
