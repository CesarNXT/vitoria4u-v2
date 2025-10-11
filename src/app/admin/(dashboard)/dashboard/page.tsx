
'use client'

import { useState, useEffect } from 'react'
import { useFirebase } from '@/firebase'
import type { ConfiguracoesNegocio } from '@/lib/types'
import { Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { collection, onSnapshot } from 'firebase/firestore'
import { AdminStatsCards } from '../admin-stats-cards'
import { AdminGrowthChart, AdminSalesChart } from '../admin-growth-chart'
import { DataTable } from '@/components/data-table'
import { getAdminBusinessesColumns } from '../admin-businesses-columns'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isFuture, differenceInDays } from 'date-fns'


export default function AdminDashboardPage() {
  const { toast } = useToast()
  const { firestore } = useFirebase()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<ConfiguracoesNegocio[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!firestore) return;
    
    const businessesRef = collection(firestore, 'negocios')
    const unsubscribe = onSnapshot(businessesRef, (snapshot) => {
      const businessesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        access_expires_at: doc.data().access_expires_at?.toDate ? doc.data().access_expires_at.toDate() : new Date(doc.data().access_expires_at),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      } as ConfiguracoesNegocio));
      setBusinesses(businessesData)
      setIsLoading(false)
    }, (error) => {
      console.error("Error fetching businesses:", error);
      toast({ variant: "destructive", title: "Erro ao buscar negócios" });
      setIsLoading(false);
    });

    return () => unsubscribe()
  }, [firestore, toast])
  
  const handleAccessPanel = (business: ConfiguracoesNegocio) => {
    localStorage.setItem('impersonatedBusinessId', business.id);
    router.push('/dashboard');
  };

  const expiringSoonBusinesses = businesses.filter(b => {
    if (!b.access_expires_at) return false;
    const expirationDate = b.access_expires_at.toDate ? b.access_expires_at.toDate() : new Date(b.access_expires_at);
    return isFuture(expirationDate) && differenceInDays(expirationDate, new Date()) <= 15;
  }).sort((a, b) => {
      const dateA = a.access_expires_at.toDate ? a.access_expires_at.toDate() : new Date(a.access_expires_at);
      const dateB = b.access_expires_at.toDate ? b.access_expires_at.toDate() : new Date(b.access_expires_at);
      return dateA.getTime() - dateB.getTime();
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard do Administrador</h1>
          <p className="text-muted-foreground">Visão geral e métricas de crescimento da plataforma.</p>
        </div>
      </div>
      
      <AdminStatsCards businesses={businesses} />
      
      <div className="grid gap-8 md:grid-cols-2">
        <AdminGrowthChart businesses={businesses} />
        <AdminSalesChart businesses={businesses} />
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Planos Expirando em Breve (Próximos 15 dias)</CardTitle>
          <CardDescription>
            Clientes que precisam de atenção para renovação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={getAdminBusinessesColumns({ onEdit: () => {}, onAccessPanel: handleAccessPanel })}
            data={expiringSoonBusinesses}
            filterColumn={{
              id: "nome",
              placeholder: "Filtrar por nome...",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
