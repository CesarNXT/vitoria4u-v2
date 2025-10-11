"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Escolha uma data",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange?.(selectedDate)
      setOpen(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(!open)
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ptBR }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        onInteractOutside={(e) => {
          // Previne o fechamento quando clica dentro do calendário
          const target = e.target as Element
          if (target.closest('[data-radix-popper-content-wrapper]') || 
              target.closest('.rdp') || 
              target.closest('[role="dialog"]') ||
              target.closest('button[name="previous-month"]') ||
              target.closest('button[name="next-month"]')) {
            e.preventDefault()
            return
          }
        }}
        onPointerDownOutside={(e) => {
          // Previne o fechamento em pointer events também
          const target = e.target as Element
          if (target.closest('[data-radix-popper-content-wrapper]') || 
              target.closest('.rdp') || 
              target.closest('[role="dialog"]')) {
            e.preventDefault()
            return
          }
        }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date("1900-01-01")}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
