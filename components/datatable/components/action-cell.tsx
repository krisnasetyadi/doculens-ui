import { Fragment } from "react"
import Link from "next/link"
import type { Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ActionMenuContent, ActionMenuItem, ActionMenuSeparator } from "@/components/action-menu"

import { cn } from "@/lib/utils"
import type { ActionItem } from "../types"
import { IconButton } from "@/components/icon-button";

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
          <IconButton
            label={action.title}
            asChild
            variant="default"
            size="sm"
            disabled={disabled}
            className={action.className}
          >
            <Link href={href}>{action.icon || action.title.charAt(0)}</Link>
          </IconButton>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center">
        <IconButton
          label={action.title}
          variant="default"
          size="sm"
          onClick={() => action.onClick?.(rowData)}
          disabled={disabled}
          className={action.className}
        >
          {action.icon || action.title.charAt(0)}
        </IconButton>
      </div>
    )
  }

  // More than 1 action - show dropdown with three dots
  return (
    <div className="flex items-center justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label="Open menu" variant="default" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        </DropdownMenuTrigger>
        <ActionMenuContent>
          {visibleActions.map((action, index) => {
            const href = getHref(action)
            const disabled = isDisabled(action)

            if (href) {
              return (
                <Fragment key={`action-${index}`}>
                  <ActionMenuItem asChild disabled={disabled}>
                    <Link href={href}>
                      {action.icon && (
                        <span className="shrink-0">{action.icon}</span>
                      )}
                      {action.title}
                    </Link>
                  </ActionMenuItem>
                  {action.separator && <ActionMenuSeparator />}
                </Fragment>
              )
            }

            return (
              <Fragment key={`action-${index}`}>
                <ActionMenuItem
                  onClick={() => action.onClick?.(rowData)}
                  disabled={disabled}
                >
                  {action.icon && <span className="shrink-0">{action.icon}</span>}
                  {action.title}
                </ActionMenuItem>
                {action.separator && <ActionMenuSeparator />}
              </Fragment>
            )
          })}
        </ActionMenuContent>
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
            <IconButton
              label={action.title}
              key={`inline-action-${index}`}
              asChild
              size="sm"
              disabled={disabled}
            >
              <Link href={href}>{action.icon || action.title.charAt(0)}</Link>
            </IconButton>
          )
        }

        return (
          <IconButton
            label={action.title}
            key={`inline-action-${index}`}
            size="sm"
            onClick={() => action.onClick?.(rowData)}
            disabled={disabled}
          >
            {action.icon || action.title.charAt(0)}
          </IconButton>
        )
      })}

      {overflowActions.length > 0 && (
        <ActionCell row={row} actions={overflowActions} />
      )}
    </div>
  )
}
