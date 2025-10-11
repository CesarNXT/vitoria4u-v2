
"use client"

import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltipContent, ChartTooltip, ChartContainer } from "@/components/ui/chart"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { useMemo } from "react"
import { subDays, eachDayOfInterval, format, isSameDay, isFuture } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AdminChartsProps {
  businesses: ConfiguracoesNegocio[];
}

const COLORS = {
  plano_basico: "hsl(var(--chart-1))",
  plano_intermediario: "hsl(var(--chart-2))",
  plano_avancado: "hsl(var(--primary))",
};
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


export function AdminGrowthChart({ businesses }: AdminChartsProps) {

  const growthChartData = useMemo(() => {
    const today = new Date();
    const fifteenDaysAgo = subDays(today, 14); // Last 15 days including today
    const daysInterval = eachDayOfInterval({ start: fifteenDaysAgo, end: today });

    return daysInterval.map(day => {
      const signupsOnDay = businesses.filter(business => {
        const createdAt = business.createdAt?.toDate ? business.createdAt.toDate() : new Date(business.createdAt);
        return isSameDay(createdAt, day);
      }).length;

      return {
        date: format(day, "dd/MM"),
        Cadastros: signupsOnDay,
      };
    });
  }, [businesses]);
  
  const maxSignups = useMemo(() => {
    if (growthChartData.length === 0) return 5;
    const max = Math.max(...growthChartData.map(d => d.Cadastros));
    return Math.max(5, Math.ceil(max * 1.2));
  }, [growthChartData]);


  const growthChartConfig = {
      Cadastros: {
        label: "Novos Cadastros",
        color: "hsl(var(--primary))",
      },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crescimento de Contas</CardTitle>
        <CardDescription>Novos negócios cadastrados nos últimos 15 dias.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={growthChartConfig} className="min-h-[250px] w-full">
            <BarChart data={growthChartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                />
                 <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    allowDecimals={false}
                    domain={[0, maxSignups]}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="Cadastros" fill="var(--color-Cadastros)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function AdminSalesChart({ businesses }: AdminChartsProps) {
    const salesData = useMemo(() => {
        const activePlans = businesses.filter(b => b.access_expires_at && isFuture(new Date(b.access_expires_at)));
        
        const planCounts = activePlans.reduce((acc, business) => {
            const planId = business.planId || 'desconhecido';
            acc[planId] = (acc[planId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(planCounts).map(([name, value]) => ({ name, value, fill: COLORS[name as keyof typeof COLORS] || '#cccccc' }));
    }, [businesses]);

    const salesChartConfig = {
        value: { label: 'Planos Ativos' },
        plano_basico: { label: 'Básico' },
        plano_intermediario: { label: 'Intermediário' },
        plano_avancado: { label: 'Avançado' },
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vendas do Mês (Planos Ativos)</CardTitle>
                <CardDescription>Distribuição dos planos ativos atualmente.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={salesChartConfig} className="min-h-[250px] w-full">
                    <PieChart>
                         <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                        <Pie
                            data={salesData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            labelLine={false}
                            label={renderCustomizedLabel}
                        >
                            {salesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Legend />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
