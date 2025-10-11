
"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltipContent, ChartTooltip, ChartContainer } from "@/components/ui/chart"
import type { Agendamento } from "@/lib/types"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, getMonth, getYear, setMonth, setYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AppointmentsChartProps {
  appointments: Agendamento[];
}

const generateYearOptions = () => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push(currentYear - i);
    }
    return years;
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: capitalize(format(new Date(2000, i), "LLLL", { locale: ptBR })),
}));

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function AppointmentsChart({ appointments }: AppointmentsChartProps) {

  const [selectedDate, setSelectedDate] = useState(new Date());

  const chartData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map(day => {
      const appointmentsOnDay = appointments.filter(appt => {
        const apptDate = appt.date.toDate ? appt.date.toDate() : new Date(appt.date);
        return isSameDay(apptDate, day);
      });

      return {
        date: format(day, "dd"),
        fullDate: format(day, "yyyy-MM-dd"),
        Agendados: appointmentsOnDay.filter(a => a.status === 'Agendado').length,
        Finalizados: appointmentsOnDay.filter(a => a.status === 'Finalizado').length,
      };
    });
  }, [appointments, selectedDate]);
  
  const maxAppointments = useMemo(() => {
    if (chartData.length === 0) return 5;
    const max = Math.max(...chartData.map(d => d.Agendados + d.Finalizados));
    return Math.max(5, Math.ceil(max * 1.2)); 
  }, [chartData]);


  const chartConfig = {
      Agendados: {
        label: "Agendados",
        color: "hsl(221.2 83.2% 53.3%)",
      },
      Finalizados: {
        label: "Finalizados",
        color: "hsl(142.1 76.2% 36.3%)",
      },
  };

  const handleMonthChange = (monthIndex: string) => {
    setSelectedDate(prev => setMonth(prev, parseInt(monthIndex, 10)));
  };

  const handleYearChange = (year: string) => {
    setSelectedDate(prev => setYear(prev, parseInt(year, 10)));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Visão Geral do Mês</CardTitle>
                <CardDescription>Atividade de agendamentos por dia no mês selecionado.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Select onValueChange={handleMonthChange} value={String(getMonth(selectedDate))}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map(option => (
                             <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select onValueChange={handleYearChange} value={String(getYear(selectedDate))}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                       {generateYearOptions().map(year => (
                           <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                       ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={false}
                    tickMargin={10}
                />
                 <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    allowDecimals={false}
                    domain={[0, maxAppointments]}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="Finalizados" fill="var(--color-Finalizados)" radius={4} stackId="a" />
                <Bar dataKey="Agendados" fill="var(--color-Agendados)" radius={4} stackId="a" />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
