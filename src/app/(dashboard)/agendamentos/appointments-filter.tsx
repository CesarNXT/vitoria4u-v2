
'use client'

import { Button } from "@/components/ui/button"
import { StandardDatePicker } from "@/components/ui/standard-date-picker"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import type { Servico, Profissional } from "@/lib/types"

export interface AppointmentFilters {
  clientName: string;
  professionalId: string;
  serviceId: string;
  status: string;
  date: Date | null;
}

interface AppointmentsFilterProps {
  filters: AppointmentFilters;
  onFiltersChange: (filters: AppointmentFilters) => void;
  services: Servico[];
  professionals: Profissional[];
}

export function AppointmentsFilter({ filters, onFiltersChange, services, professionals }: AppointmentsFilterProps) {

  const handleFilterChange = (key: keyof AppointmentFilters, value: any) => {
    // If the "all" option is selected, clear the filter for that key
    const finalValue = value === 'all' ? '' : value;
    onFiltersChange({ ...filters, [key]: finalValue });
  };

  const clearFilters = () => {
    onFiltersChange({
      clientName: '',
      professionalId: '',
      serviceId: '',
      status: '',
      date: null,
    });
  }

  const activeFiltersCount = Object.values(filters).filter(v => v !== '' && v !== null).length;

  return (
    <div className="p-4 mb-4 rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Input
                placeholder="Filtrar por cliente..."
                value={filters.clientName}
                onChange={(e) => handleFilterChange('clientName', e.target.value)}
                className="lg:col-span-2"
            />
            <StandardDatePicker
                value={filters.date || undefined}
                onChange={(d) => handleFilterChange('date', d || null)}
                placeholder="Data"
                className="w-full"
            />
            
            <Select value={filters.professionalId} onValueChange={(v) => handleFilterChange('professionalId', v)}>
                <SelectTrigger>
                    <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select value={filters.serviceId} onValueChange={(v) => handleFilterChange('serviceId', v)}>
                <SelectTrigger>
                    <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
            </Select>
            
            <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger>
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
            </Select>
            
        </div>
        {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-4">
                <X className="mr-2 h-4 w-4" />
                Limpar {activeFiltersCount} filtro(s)
            </Button>
        )}
    </div>
  )
}
