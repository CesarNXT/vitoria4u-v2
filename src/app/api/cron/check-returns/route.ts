import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { model } from '@/ai/genkit';
import { checkCronAuth } from '@/lib/cron-auth';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

// 💬 MENSAGENS DE REMARKETING POR CATEGORIA
const RETURN_MESSAGES = {
  barbearia: (nome: string, servico: string, dias: number, empresa: string) =>
    `💈 *Fala, ${nome}!* 💈\n\n` +
    `Já faz *${dias} dias* desde seu último *${servico}*!\n\n` +
    `🔥 *Tá na hora de renovar o visual!*\n` +
    `Aquele corte impecável te espera aqui.\n\n` +
    `⚡ Agenda aí e volta para ficar no ponto!\n\n` +
    `*${empresa}* 💯`,

  clinica: (nome: string, servico: string, dias: number, empresa: string) =>
    `🏥 *Olá, ${nome}!* 🏥\n\n` +
    `Já se passaram *${dias} dias* desde sua última *${servico}*.\n\n` +
    `💙 *Sua saúde merece atenção contínua!*\n` +
    `Que tal agendar seu retorno para manter tudo em dia?\n\n` +
    `✨ Estamos aqui para cuidar de você!\n\n` +
    `*${empresa}* - Seu bem-estar é nossa prioridade 🩺`,

  estetica: (nome: string, servico: string, dias: number, empresa: string) =>
    `✨ *Oi, ${nome}!* ✨\n\n` +
    `Sua última sessão de *${servico}* foi há *${dias} dias*!\n\n` +
    `💆‍♀️ *Hora de renovar aquele brilho!*\n` +
    `Seus resultados merecem continuidade.\n\n` +
    `🌟 Que tal agendar e potencializar ainda mais sua beleza?\n\n` +
    `*${empresa}* - Realçando sua beleza natural 💎`,

  lash: (nome: string, servico: string, dias: number, empresa: string) =>
    `👁️ *Oi, linda!* 👁️\n\n` +
    `Já faz *${dias} dias* desde seu *${servico}*!\n\n` +
    `💕 *Seus cílios merecem aquele toque especial!*\n` +
    `Vamos manter esse olhar poderoso?\n\n` +
    `✨ Agenda comigo e volta a arrasar!\n\n` +
    `*${empresa}* - Olhar que encanta 😍`,

  salao: (nome: string, servico: string, dias: number, empresa: string) =>
    `💇‍♀️ *Oi, ${nome}!* 💇‍♀️\n\n` +
    `Seu último *${servico}* foi há *${dias} dias*!\n\n` +
    `💖 *Tá na hora de renovar o visual!*\n` +
    `Seus cabelos merecem aquele cuidado especial.\n\n` +
    `✨ Que tal marcar e ficar deslumbrante de novo?\n\n` +
    `*${empresa}* - Transformando seu visual 🌸`,

  odontologia: (nome: string, servico: string, dias: number, empresa: string) =>
    `😁 *Olá, ${nome}!* 😁\n\n` +
    `Já faz *${dias} dias* desde seu último *${servico}*!\n\n` +
    `🦷 *Seu sorriso merece cuidado contínuo!*\n` +
    `Manter a saúde bucal em dia é essencial.\n\n` +
    `✨ Vamos agendar sua próxima consulta?\n\n` +
    `*${empresa}* - Cuidando do seu sorriso 💙`,

  academia: (nome: string, servico: string, dias: number, empresa: string) =>
    `💪 *E aí, ${nome}!* 💪\n\n` +
    `Faz *${dias} dias* que você não aparece para *${servico}*!\n\n` +
    `🔥 *Seus resultados não podem parar!*\n` +
    `Vamos retomar e continuar evoluindo?\n\n` +
    `⚡ Bora agendar e voltar com tudo!\n\n` +
    `*${empresa}* - Seu progresso te espera 🏋️`,

  default: (nome: string, servico: string, dias: number, empresa: string) =>
    `✨ *Olá, ${nome}!* ✨\n\n` +
    `Já se passaram *${dias} dias* desde seu último *${servico}*.\n\n` +
    `💙 *Sentimos sua falta!*\n` +
    `Que tal agendar e continuar cuidando de você?\n\n` +
    `📞 Estamos te esperando!\n\n` +
    `*${empresa}* 🌟`
};

// 🤖 Gerar mensagem com IA (fallback para mensagens pré-definidas)
async function generateSmartReturnMessage(
  nomeCliente: string,
  nomeServico: string,
  diasRetorno: number,
  nomeEmpresa: string,
  categoria: string,
  useAI: boolean = true
): Promise<string> {
  const firstName = nomeCliente.split(' ')[0];
  const categoriaKey = categoria.toLowerCase().replace(/\s+/g, '');
  
  // Se não usar IA ou falhar, usa mensagem pré-definida
  const getFallbackMessage = () => {
    const messageFunc = (RETURN_MESSAGES as any)[categoriaKey] || RETURN_MESSAGES.default;
    return messageFunc(firstName, nomeServico, diasRetorno, nomeEmpresa);
  };

  // Tentar gerar com IA se habilitado
  if (useAI && process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Crie uma mensagem de remarketing para WhatsApp para fazer um cliente retornar.

Contexto:
- Cliente: ${firstName}
- Serviço feito: ${nomeServico}
- Dias desde o último serviço: ${diasRetorno}
- Tipo de negócio: ${categoria}
- Nome da empresa: ${nomeEmpresa}

Regras:
1. Tom persuasivo mas amigável
2. Específico para o tipo de negócio (${categoria})
3. Mencionar benefícios de manter a continuidade
4. Usar emojis relevantes
5. Máximo 150 palavras
6. Finalizar com o nome da empresa
7. Usar formatação WhatsApp (*negrito*, _itálico_)
8. Criar senso de urgência sutil

NÃO incluir:
- Links ou URLs
- Preços ou valores
- Horários específicos

Gere APENAS a mensagem, sem explicações.`;

      const result = await model.generateContent(prompt);
      const aiMessage = result.response.text().trim();
      
      if (aiMessage && aiMessage.length > 20) {
        console.log(`✨ [RETURN] Mensagem IA gerada para ${firstName}`);
        return aiMessage;
      }
    } catch (error) {
      console.warn(`⚠️ [RETURN] Falha na IA, usando mensagem pré-definida:`, error);
    }
  }

  return getFallbackMessage();
}

// 📱 Enviar mensagem de retorno via WhatsApp
async function sendReturnNotification(
  tokenInstancia: string,
  telefoneCliente: string | number,
  message: string
): Promise<boolean> {
  try {
    const cleanPhone = telefoneCliente.toString().replace(/\D/g, '');
    
    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    });

    if (response.ok) {
      return true;
    } else {
      const errorText = await response.text().catch(() => 'Erro desconhecido');
      console.warn(`⚠️ [RETURN] Falha ao enviar: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [RETURN] Erro ao enviar notificação:`, error);
    return false;
  }
}

/**
 * 🔍 Verificar se cliente tem agendamento futuro
 * Evita enviar retornos se o cliente já tem outro agendamento próximo
 */
async function hasUpcomingAppointment(
  businessId: string,
  clientePhone: string | number,
  appointmentDate: Date
): Promise<boolean> {
  try {
    const futureDate = addDays(startOfDay(appointmentDate), 5); // Verifica 5 dias a frente
    
    const snapshot = await adminDb
      .collection(`negocios/${businessId}/agendamentos`)
      .where('cliente.phone', '==', clientePhone)
      .where('status', '==', 'Agendado')
      .where('date', '>', appointmentDate)
      .where('date', '<=', futureDate)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar agendamentos futuros:', error);
    return false;
  }
}

function toDate(value: any): Date | null {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

export async function GET(request: Request) {
    const authError = checkCronAuth(request);
    if (authError) return authError;
    
    try {
        const today = startOfDay(new Date());
        
        const businessesSnapshot = await adminDb.collection('negocios')
            .where('whatsappConectado', '==', true)
            .get();
        
        let returnCount = 0;
        let businessesProcessed = 0;
        let totalReads = businessesSnapshot.size;
        
        const BATCH_SIZE = 15;
        const businesses = businessesSnapshot.docs;
        
        for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
            const batch = businesses.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (businessDoc) => {
                const businessData = businessDoc.data();
                const businessId = businessDoc.id;

                if (!businessData.tokenInstancia) {
                    return;
                }

                let businessHasReturns = false;

                const appointmentsSnapshot = await adminDb
                    .collection(`negocios/${businessId}/agendamentos`)
                    .where('status', '==', 'Finalizado')
                    .get();
                
                totalReads += appointmentsSnapshot.size;

                const returnPromises = appointmentsSnapshot.docs.map(async (appointmentDoc) => {
                    const appointmentData = appointmentDoc.data();
                    const service = appointmentData.servico;

                    if (!service || typeof service.returnInDays !== 'number' || service.returnInDays <= 0) {
                        return;
                    }
                    
                    const appointmentDate = toDate(appointmentData.date);
                    if (!appointmentDate) {
                        return;
                    }

                    const returnDate = addDays(startOfDay(appointmentDate), service.returnInDays);
                    
                    if (!isSameDay(today, returnDate)) {
                        return;
                    }
                    
                    const client = appointmentData.cliente;
                    
                    // 🔍 VERIFICAR SE TEM AGENDAMENTO FUTURO
                    const hasFutureAppointment = await hasUpcomingAppointment(
                        businessId,
                        client.phone,
                        appointmentDate
                    );

                    if (hasFutureAppointment) {
                        // Cliente já tem agendamento próximo, não enviar retorno
                        return;
                    }
                    
                    try {
                        // Gerar mensagem inteligente
                        const message = await generateSmartReturnMessage(
                            client.name,
                            service.name,
                            service.returnInDays,
                            businessData.nome,
                            businessData.categoria || 'Estabelecimento',
                            true // Usar IA (pode configurar false para desabilitar)
                        );

                        // Enviar notificação
                        const sent = await sendReturnNotification(
                            businessData.tokenInstancia,
                            client.phone,
                            message
                        );

                        if (sent) {
                            console.log(`✅ [RETURN] Mensagem enviada para ${client.name} (${businessData.categoria})`);
                            returnCount++;
                            businessHasReturns = true;
                        }
                    } catch (error) {
                        console.error(`❌ [RETURN] Erro ao enviar retorno para ${client.name}:`, error);
                    }
                });
                
                await Promise.all(returnPromises);

                if (businessHasReturns) {
                    businessesProcessed++;
                }
            }));
        }
        
        return NextResponse.json({ 
            message: `Return checks completed. Found ${returnCount} returns in ${businessesProcessed} businesses.`,
            returnCount,
            businessesProcessed,
            totalReads
        });
    } catch (error: any) {
        console.error('CRON Job (check-returns) failed:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
