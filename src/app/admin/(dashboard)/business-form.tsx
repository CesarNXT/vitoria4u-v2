
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SimpleDatePicker } from '@/components/ui/simple-date-picker'
import { Loader2 } from 'lucide-react'
import type { ConfiguracoesNegocio, Plano } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import React, { useState, useEffect } from 'react'
import { useFirebase } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

const businessFormSchema = z.object({
  planId: z.string().min(1, 'O plano é obrigatório.'),
  access_expires_at: z.date({ required_error: 'A data de expiração é obrigatória.' }),
})

type BusinessFormValues = z.infer<typeof businessFormSchema>

interface BusinessFormProps {
  business: ConfiguracoesNegocio | null
  onSubmit: (data: BusinessFormValues) => void
  isSubmitting: boolean
}

export function BusinessForm({ business, onSubmit, isSubmitting }: BusinessFormProps) {
  const [plans, setPlans] = useState<Plano[]>([])
  const { firestore } = useFirebase()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      planId: business?.planId || '',
      access_expires_at: business?.access_expires_at ? new Date(business.access_expires_at) : new Date(),
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (business) {
      form.reset({
        planId: business.planId || 'gratis',
        access_expires_at: business.access_expires_at ? new Date(business.access_expires_at) : new Date(),
      })
    }
  }, [business, form])

  useEffect(() => {
    if (!firestore) return
    
    const fetchPlans = async () => {
      try {
        const plansSnapshot = await getDocs(collection(firestore, 'planos'))
        const plansData = plansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Plano)).sort((a, b) => a.price - b.price)
        setPlans(plansData)
      } catch (error) {
        console.error('Error fetching plans:', error)
      }
    }
    
    fetchPlans()
  }, [firestore])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        
        <FormField
          control={form.control}
          name="planId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plano de Assinatura</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {plans.length > 0 ? (
                    plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}{plan.price > 0 ? ` - R$ ${plan.price.toFixed(2)}` : ' - Gratuito'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="access_expires_at"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Acesso Expira em</FormLabel>
                    <FormControl>
                        <SimpleDatePicker
                            date={field.value}
                            onDateChange={(date) => {
                              field.onChange(date);
                              setIsDatePickerOpen(false); // Fechar o popover ao selecionar
                            }}
                            placeholder="Escolha uma data de expiração"
                            isOpen={isDatePickerOpen}
                            onOpenChange={setIsDatePickerOpen}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>
    </Form>
  )
}
