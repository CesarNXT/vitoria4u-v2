'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CaptionProps, useNavigation, useDayPicker } from 'react-day-picker'

/**
 * 📅 Calendário Padrão Vitoria4U
 * 
 * Componente único de seleção de data usado em TODO o sistema.
 * 
 * Características:
 * - Dropdown para Mês e Ano
 * - Formato PT-BR
 * - Responsivo (Dialog em mobile, Popover em desktop)
 * - Customizável via props
 */

interface StandardDatePickerProps {
  /** Data selecionada */
  value?: Date
  /** Callback quando a data é selecionada */
  onChange: (date: Date | undefined) => void
  /** Texto do placeholder */
  placeholder?: string
  /** Desabilitar o campo */
  disabled?: boolean
  /** Ano inicial (padrão: 1950) */
  fromYear?: number
  /** Ano final (padrão: ano atual) */
  toYear?: number
  /** Data mínima permitida */
  minDate?: Date
  /** Data máxima permitida */
  maxDate?: Date
  /** Função customizada para desabilitar datas específicas */
  disabledDates?: (date: Date) => boolean
  /** Usar Dialog em todos os dispositivos (não só mobile) */
  forceDialog?: boolean
  /** ClassName customizado */
  className?: string
  /** isMobile (detecta automaticamente se não fornecido) */
  isMobile?: boolean
}

function CustomCaption(props: CaptionProps) {
  const { goToMonth, currentMonth } = useNavigation()
  const { fromDate, toDate, locale } = useDayPicker()

  const handleMonthChange = (value: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(parseInt(value, 10))
    goToMonth(newMonth)
  }

  const handleYearChange = (value: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setFullYear(parseInt(value, 10))
    goToMonth(newMonth)
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i), 'MMMM', { locale }),
  }))

  const years: number[] = []
  const startYear = fromDate?.getFullYear() || 1950
  const endYear = toDate?.getFullYear() || new Date().getFullYear()
  for (let i = startYear; i <= endYear; i++) {
    years.push(i)
  }

  return (
    <div className="flex justify-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
      <Select
        value={currentMonth.getMonth().toString()}
        onValueChange={handleMonthChange}
        aria-label="Mês"
      >
        <SelectTrigger className="w-[130px] font-medium" onClick={(e) => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={currentMonth.getFullYear().toString()}
        onValueChange={handleYearChange}
        aria-label="Ano"
      >
        <SelectTrigger className="w-[90px] font-medium" onClick={(e) => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          {years.reverse().map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function StandardDatePicker({
  value,
  onChange,
  placeholder = 'Escolha uma data',
  disabled = false,
  fromYear = 1950,
  toYear = new Date().getFullYear(),
  minDate,
  maxDate,
  disabledDates,
  forceDialog = false,
  className,
  isMobile: isMobileProp,
}: StandardDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const defaultDisabledDates = (date: Date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    if (disabledDates) return disabledDates(date)
    return false
  }

  const calendarComponent = (
    <div onClick={(e) => e.stopPropagation()}>
      <Calendar
        mode="single"
        selected={value}
        onSelect={(date) => {
          // Evitar deselecionar ao clicar na mesma data
          // Se date for undefined e já tiver uma data selecionada, manter a data
          if (date === undefined && value) {
            // Usuário clicou na mesma data - manter selecionada
            setIsOpen(false);
            return;
          }
          
          onChange(date)
          setIsOpen(false)
        }}
        locale={ptBR}
        captionLayout="dropdown-buttons"
        fromYear={fromYear}
        toYear={toYear}
        disabled={defaultDisabledDates}
        initialFocus
        components={{
          Caption: CustomCaption,
        }}
      />
    </div>
  )

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'w-full justify-start text-left font-normal hover:bg-accent transition-colors',
        !value && 'text-muted-foreground',
        className
      )}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
      {value && value instanceof Date && !isNaN(value.getTime()) ? (
        <span className="font-medium">{format(value, 'dd/MM/yyyy')}</span>
      ) : (
        <span>{placeholder}</span>
      )}
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="w-auto p-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Selecione uma data</DialogTitle>
          <DialogDescription className="sr-only">
            Use os controles para escolher a data desejada.
          </DialogDescription>
        </DialogHeader>
        {calendarComponent}
      </DialogContent>
    </Dialog>
  )
}
