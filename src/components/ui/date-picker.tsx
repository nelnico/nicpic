"use client"

import { useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { DayPicker } from "react-day-picker"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function parseDateString(s: string): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDisplay(s: string): string {
  const d = parseDateString(s)
  if (!d) return s
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", disabled, className }: Props) {
  const [open, setOpen] = useState(false)
  const selected = parseDateString(value)

  function handleSelect(date: Date | undefined) {
    onChange(date ? toDateString(date) : "")
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Popover.Popup className="rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected}
              classNames={{
                root: "select-none",
                months: "relative",
                month: "space-y-3",
                month_caption: "flex h-7 items-center justify-center",
                caption_label: "text-sm font-medium",
                nav: "absolute inset-x-0 top-0 flex items-center justify-between",
                button_previous: cn(
                  "flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground",
                  "hover:bg-accent hover:text-accent-foreground transition-colors"
                ),
                button_next: cn(
                  "flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground",
                  "hover:bg-accent hover:text-accent-foreground transition-colors"
                ),
                month_grid: "mt-1 w-full border-collapse",
                weekdays: "",
                weekday: "w-8 pb-1 text-center text-xs text-muted-foreground",
                week: "",
                day: "p-0 text-center",
                day_button: cn(
                  "flex size-8 items-center justify-center rounded-md text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                ),
                selected:
                  "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
                today: "[&>button]:font-semibold [&>button]:underline",
                outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
                disabled: "[&>button]:opacity-30 [&>button]:cursor-not-allowed",
                hidden: "invisible",
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeftIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  ),
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
