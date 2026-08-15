'use client'

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

const VARIANT_ICON = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
  warning: AlertTriangle,
} as const

const VARIANT_ICON_CLASS = {
  default: 'text-primary',
  success: 'text-green-600 dark:text-green-400',
  destructive: 'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
} as const

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const key = variant ?? 'default'
        const Icon = VARIANT_ICON[key]
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', VARIANT_ICON_CLASS[key])} />
            <div className="grid flex-1 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
