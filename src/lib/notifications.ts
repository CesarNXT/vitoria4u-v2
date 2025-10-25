/**
 * Sistema de Notificações WhatsApp
 * Versão limpa e otimizada para produção
 */

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com'
const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20'

// Formata telefone para exibição
function formatPhoneForDisplay(phone: string | number): string {
  const cleaned = phone.toString().replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`
  }
  return cleaned
}

// Envia SMS via API
async function sendSMS(phone: string, text: string): Promise<void> {
  try {
    const cleanPhone = phone.toString().replace(/\D/g, '')
    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': NOTIFICATION_TOKEN },
      body: JSON.stringify({ number: cleanPhone, text })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao enviar SMS:', error.message)
  }
}

// Notifica gestor sobre novo agendamento
export async function notifyNewAppointment(data: {
  telefoneEmpresa: string
  nomeCliente: string
  nomeServico: string
  dataHoraAtendimento: string
  telefoneCliente?: string
  isFromPanel?: boolean
}): Promise<void> {
  const agendadoPor = data.isFromPanel ? 'Gestor' : 'Cliente'
  
  const message = `*📋 Novo Agendamento*

*📅 Data e hora:* ${data.dataHoraAtendimento}

*👤 Cliente:* ${data.nomeCliente}${data.telefoneCliente ? `\n*📱 Telefone:* ${formatPhoneForDisplay(data.telefoneCliente)}` : ''}
*💼 Procedimento:* ${data.nomeServico}

*📝 Agendado por:* ${agendadoPor}`

  await sendSMS(data.telefoneEmpresa, message)
}

// Notifica cliente sobre confirmação
export async function notifyClientAppointmentConfirmation(data: {
  tokenInstancia: string
  telefoneCliente: string
  nomeCliente: string
  nomeEmpresa: string
  categoriaEmpresa?: string
  dataHoraAtendimento: string
  nomeServico: string
  nomeProfissional?: string
  criadoPor?: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    const categoria = data.categoriaEmpresa || 'estabelecimento'
    
    const message = `✨ *Olá, ${firstName}!* ✨

🎉 Seu agendamento foi confirmado!

📅 *Data e Hora*
${data.dataHoraAtendimento}

🏢 *${categoria}*
${data.nomeEmpresa}

💼 *Procedimento*
${data.nomeServico}${data.criadoPor ? `\n\n📝 *Agendado por:* ${data.criadoPor}` : ''}

Nos vemos em breve! 😊`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao notificar cliente:', error.message)
  }
}

// Notifica cliente sobre cancelamento
export async function notifyClientCancellation(data: {
  tokenInstancia: string
  telefoneCliente: string
  nomeCliente: string
  nomeEmpresa: string
  categoriaEmpresa?: string
  dataHoraAtendimento: string
  nomeServico: string
  nomeProfissional?: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    const categoria = data.categoriaEmpresa || 'estabelecimento'
    
    const message = `❌ *Olá, ${firstName}!*

Seu agendamento foi cancelado.

📅 *Data e Hora*
${data.dataHoraAtendamento}

🏢 *${categoria}*
${data.nomeEmpresa}

💼 *Procedimento*
${data.nomeServico}

Se desejar reagendar, entre em contato conosco.`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao notificar cliente sobre cancelamento:', error.message)
  }
}

// Notifica profissional sobre novo agendamento
export async function notifyProfessionalAppointment(data: {
  tokenInstancia: string
  telefoneProfissional: string | number
  nomeProfissional: string
  nomeCliente: string
  telefoneCliente?: string
  nomeServico: string
  dataHoraAtendimento: string
  criadoPor?: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneProfissional.toString().replace(/\D/g, '')
    const firstName = data.nomeProfissional.split(' ')[0]
    
    const message = `✨ *Olá, ${firstName}!* ✨

🎉 Você tem um novo agendamento!

📅 *Data e Hora*
${data.dataHoraAtendimento}

👤 *Cliente*
${data.nomeCliente}${data.telefoneCliente ? `\n📱 ${formatPhoneForDisplay(data.telefoneCliente)}` : ''}

💼 *Procedimento*
${data.nomeServico}${data.criadoPor ? `\n\n📝 *Agendado por:* ${data.criadoPor}` : ''}

Nos vemos em breve! 😊`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao notificar profissional:', error.message)
  }
}

// Notifica profissional sobre cancelamento
export async function notifyProfessionalCancellation(data: {
  tokenInstancia: string
  telefoneProfissional: string | number
  nomeProfissional: string
  nomeCliente: string
  nomeServico: string
  dataHoraAtendimento: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneProfissional.toString().replace(/\D/g, '')
    const firstName = data.nomeProfissional.split(' ')[0]
    
    const message = `⚠️ *Oi, ${firstName}!* ⚠️

❌ Um agendamento foi cancelado.

📅 *Data e Hora*
${data.dataHoraAtendimento}

👤 *Cliente*
${data.nomeCliente}

💼 *Procedimento*
${data.nomeServico}

Você tem um horário livre! 🕐`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao notificar profissional:', error.message)
  }
}

// Solicita feedback pós-atendimento
export async function requestFeedback(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeEmpresa: string
  feedbackLink: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    const message = `⭐ *Olá, ${firstName}!* ⭐

Esperamos que tenha gostado do atendimento! 😊

Sua opinião é muito importante para nós. Que tal avaliar sua experiência?

👉 ${data.feedbackLink}

Obrigado por escolher ${data.nomeEmpresa}! 💙`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao solicitar feedback:', error.message)
  }
}

// Notifica gestor sobre cancelamento
export async function notifyCancellation(data: {
  telefoneEmpresa: string
  nomeCliente: string
  dataHoraAtendimento: string
  nomeServico: string
  isFromPanel?: boolean
}): Promise<void> {
  const canceladoPor = data.isFromPanel ? 'Gestor' : 'Cliente'
  
  const message = `*❌ Agendamento Cancelado*

*👤 Cliente:* ${data.nomeCliente}
*📅 Data e hora:* ${data.dataHoraAtendimento}
*💼 Procedimento:* ${data.nomeServico}

*📝 Cancelado pelo ${canceladoPor}*`

  await sendSMS(data.telefoneEmpresa, message)
}

// Notifica sobre agendamento excluído
export async function notifyDeletedAppointment(data: {
  telefoneEmpresa: string
  nomeCliente: string
  dataHoraAtendimento: string
  nomeServico: string
}): Promise<void> {
  const message = `*🗑️ Agendamento Excluído*

*👤 Cliente:* ${data.nomeCliente}
*📅 Data e hora:* ${data.dataHoraAtendimento}
*💼 Procedimento:* ${data.nomeServico}

⚠️ *Certifique-se de que esta ação não foi um erro.*`

  await sendSMS(data.telefoneEmpresa, message)
}

// Lembrete de aniversário  
export async function sendBirthdayMessage(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeEmpresa: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    const message = `🎉🎂 *Parabéns, ${firstName}!* 🎂🎉

Feliz aniversário! 🥳

Desejamos que este dia seja repleto de alegrias, realizações e momentos especiais! ✨

Com carinho,
*${data.nomeEmpresa}* 💙`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao enviar mensagem de aniversário:', error.message)
  }
}

// Wrappers para compatibilidade com código antigo
export const notifyBirthday = sendBirthdayMessage;
export const notifyProfessionalNewAppointment = notifyProfessionalAppointment;
export const notifyCancelledAppointment = notifyCancellation;

// Lembretes de agendamento
export async function notifyReminder24h(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeEmpresa: string
  dataHoraAtendimento: string
  nomeServico: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    const message = `⏰ *Olá, ${firstName}!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
${data.dataHoraAtendimento}

🏢 *Local*
${data.nomeEmpresa}

💼 *Serviço*
${data.nomeServico}

Nos vemos em breve! 😊`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao enviar lembrete 24h:', error.message)
  }
}

export async function notifyReminder2h(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeEmpresa: string
  dataHoraAtendimento: string
  nomeServico: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    const message = `⏰ *${firstName}, seu horário está chegando!* ⏰

🔔 Seu agendamento é daqui a 2 horas!

📅 *Horário*
${data.dataHoraAtendimento}

🏢 *Local*
${data.nomeEmpresa}

💼 *Serviço*
${data.nomeServico}

Te esperamos! 😊`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao enviar lembrete 2h:', error.message)
  }
}

export async function notifyFeedbackRequest(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeEmpresa: string
  nomeServico?: string
  feedbackPlatform?: 'google' | 'instagram' | 'facebook'
  feedbackLink: string
}): Promise<void> {
  await requestFeedback(data);
}

// Notifica retorno de cliente
export async function notifyReturn(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeEmpresa: string
  nomeServico: string
  diasRetorno: number
  categoriaEmpresa?: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    const categoria = data.categoriaEmpresa || 'estabelecimento'
    
    const message = `✨ *Olá, ${firstName}!* ✨

Já se passaram ${data.diasRetorno} dias desde sua última consulta de ${data.nomeServico}.

Que tal agendarmos seu retorno para manter sua saúde em dia? 😊

*${categoria}*
${data.nomeEmpresa}`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': data.tokenInstancia },
      body: JSON.stringify({ number: cleanPhone, text: message })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error: any) {
    console.error('Erro ao notificar retorno:', error.message)
  }
}

// Notifica expiração de plano
export async function notifyPlanExpiration(data: {
  telefoneEmpresa: string
  nomeEmpresa: string
  diasRestantes: number
  nomePlano: string
}): Promise<void> {
  const message = `⚠️ *Aviso de Expiração do Plano*

Olá, ${data.nomeEmpresa}!

Seu plano *${data.nomePlano}* expira em ${data.diasRestantes} dias.

Renove agora para continuar aproveitando todos os benefícios! 💼`

  await sendSMS(data.telefoneEmpresa, message)
}
