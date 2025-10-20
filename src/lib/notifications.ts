/**
 * 📲 NOTIFICAÇÕES DO SISTEMA - Substitui webhooks N8N
 * 
 * ⚠️ IMPORTANTE:
 * Estas notificações usam TOKEN FIXO do SISTEMA (instância sempre conectada)
 * NÃO usa o token do usuário - SEMPRE funciona independente do WhatsApp do cliente
 * 
 * Usado para:
 * - Notificar gestor sobre novo agendamento
 * - Notificar gestor sobre cancelamento
 * - Notificar sobre conexão/desconexão do WhatsApp
 * - Outras notificações do SISTEMA
 */

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com'

/**
 * TOKEN FIXO DO SISTEMA
 * Esta instância WhatsApp está SEMPRE conectada
 * Pertence ao sistema, não ao usuário
 */
const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20'

// ==========================================
// FUNÇÃO BASE: ENVIAR SMS
// ==========================================

async function sendSMS(phone: string, text: string): Promise<void> {
  try {
    // Formatar telefone (remover caracteres não numéricos)
    const cleanPhone = phone.toString().replace(/\D/g, '')
    
    console.log('📱 Enviando SMS:', {
      phone: cleanPhone,
      text: text.substring(0, 50) + '...'
    })

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({
        number: cleanPhone,
        text
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao enviar SMS: ${error}`)
    }

    console.log('✅ SMS enviado com sucesso')
  } catch (error: any) {
    console.error('❌ Erro ao enviar SMS:', error.message)
    // Não lançar erro para não quebrar o fluxo principal
  }
}

// ==========================================
// NOTIFICAR: NOVO AGENDAMENTO
// ==========================================

/**
 * Envia notificação para o gestor quando um NOVO agendamento é criado
 * 
 * SUBSTITUI: Webhook N8N b05b9505-7564-44cc-94d1-7fc59c9e7b24
 */
export async function notifyNewAppointment(data: {
  telefoneEmpresa: string
  nomeCliente: string
  nomeServico: string
  dataHoraAtendimento: string
  criadoPor?: string
  telefoneCliente?: string
  isFromPanel?: boolean
}): Promise<void> {
  
  // Diferenciar mensagem baseado na origem
  const titulo = data.isFromPanel 
    ? '*📢 Novo Agendamento Cadastrado 📢*'
    : '*📢 Novo Agendamento Recebido 📢*'
  
  const message = `${titulo}

*📅 Data e hora:* ${data.dataHoraAtendimento}

*👤 Cliente:* ${data.nomeCliente}${data.telefoneCliente ? `\n*📱 Telefone:* ${formatPhoneForDisplay(data.telefoneCliente)}` : ''}
*💼 Procedimento:* ${data.nomeServico}${data.criadoPor ? `\n\n*📋 Agendado por:* ${data.criadoPor}` : ''}`

  await sendSMS(data.telefoneEmpresa, message)
}

// ==========================================
// NOTIFICAR: CONFIRMAÇÃO PARA O CLIENTE
// ==========================================

/**
 * Envia confirmação de agendamento para o CLIENTE
 * Usa o token da própria empresa (não o token do sistema)
 */
export async function notifyClientAppointmentConfirmation(data: {
  tokenInstancia: string // Token do WhatsApp da empresa
  telefoneCliente: string
  nomeCliente: string
  nomeEmpresa: string
  nomeServico: string
  dataHoraAtendimento: string
  nomeProfissional?: string
}): Promise<void> {
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    
    const message = `Olá *${data.nomeCliente}*! 👋

✅ Seu agendamento foi *confirmado* com sucesso!

*📅 Data e hora:* ${data.dataHoraAtendimento}
*💼 Serviço:* ${data.nomeServico}${data.nomeProfissional ? `\n*👨‍⚕️ Profissional:* ${data.nomeProfissional}` : ''}
*🏢 Local:* ${data.nomeEmpresa}

Qualquer dúvida, estamos à disposição! 😊`

    console.log('📩 Enviando confirmação para cliente:', {
      phone: cleanPhone,
      servico: data.nomeServico
    })

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': data.tokenInstancia // Usa token da empresa
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao enviar confirmação: ${error}`)
    }

    console.log('✅ Confirmação enviada para cliente com sucesso')
  } catch (error: any) {
    console.error('❌ Erro ao enviar confirmação para cliente:', error.message)
    throw error // Lança erro para poder mostrar ao usuário
  }
}

// ==========================================
// NOTIFICAR: CANCELAMENTO
// ==========================================

/**
 * Envia notificação para o gestor quando um agendamento é CANCELADO pelo cliente
 * 
 * SUBSTITUI: Webhook N8N 29baa24f-e9cf-4472-8ac6-11a6d16d11d5
 */
export async function notifyCancelledAppointment(data: {
  telefoneEmpresa: string
  nomeCliente: string
  nomeServico: string
  dataHoraAtendimento: string
  canceladoPor?: string
}): Promise<void> {
  
  const message = `*❌ Agendamento Cancelado ❌*

*📅 Data e hora:* ${data.dataHoraAtendimento}

*👤 Cliente:* ${data.nomeCliente}
*💼 Procedimento:* ${data.nomeServico}

*🔔 Cancelado por:* ${data.canceladoPor || 'Cliente'}`

  await sendSMS(data.telefoneEmpresa, message)
}

// ==========================================
// NOTIFICAR: EXCLUSÃO
// ==========================================

/**
 * Envia notificação para o gestor quando um agendamento é EXCLUÍDO do sistema
 */
export async function notifyDeletedAppointment(data: {
  telefoneEmpresa: string
  nomeCliente: string
  nomeServico: string
  dataHoraAtendimento: string
}): Promise<void> {
  
  const message = `*🗑️ Agendamento Excluído do Sistema 🗑️*

*📅 Data e hora:* ${data.dataHoraAtendimento}

*👤 Cliente:* ${data.nomeCliente}
*💼 Procedimento:* ${data.nomeServico}

*⚠️ Este registro foi removido permanentemente da agenda.*`

  await sendSMS(data.telefoneEmpresa, message)
}

// ==========================================
// NOTIFICAR PROFISSIONAL: NOVO AGENDAMENTO
// ==========================================

/**
 * Envia notificação para o PROFISSIONAL quando um NOVO agendamento é criado
 * 
 * ⚠️ USA TOKEN DO USUÁRIO (não do sistema!)
 * Só funciona se whatsappConectado === true
 * 
 * SUBSTITUI: Webhook N8N 1e24d894-12bd-4fac-86bf-4e59c658ae16
 */
export async function notifyProfessionalNewAppointment(data: {
  tokenInstancia: string
  telefoneProfissional: string | number
  nomeProfissional: string
  nomeCliente: string
  nomeServico: string
  dataHoraAtendimento: string
  criadoPor?: string
  telefoneCliente?: string
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

    console.log('[DEBUG] 🔔 Notificando profissional (novo agendamento)', {
      phone: cleanPhone,
      token: data.tokenInstancia.substring(0, 8) + '...'
    })

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': data.tokenInstancia // ← TOKEN DO USUÁRIO!
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao notificar profissional: ${error}`)
    }

    console.log('[DEBUG] ✅ Profissional notificado com sucesso')
  } catch (error: any) {
    console.error('[DEBUG] ❌ Erro ao notificar profissional:', error.message)
    // Não lançar erro para não quebrar o fluxo principal
  }
}

// ==========================================
// NOTIFICAR PROFISSIONAL: CANCELAMENTO
// ==========================================

/**
 * Envia notificação para o PROFISSIONAL quando um agendamento é CANCELADO
 * 
 * ⚠️ USA TOKEN DO USUÁRIO (não do sistema!)
 * Só funciona se whatsappConectado === true
 * 
 * SUBSTITUI: Webhook N8N fc9ff356-9ad3-4dd0-9fa2-b7175c9de037
 */
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

    console.log('[DEBUG] 🔔 Notificando profissional (cancelamento)', {
      phone: cleanPhone,
      token: data.tokenInstancia.substring(0, 8) + '...'
    })

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': data.tokenInstancia // ← TOKEN DO USUÁRIO!
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao notificar profissional: ${error}`)
    }

    console.log('[DEBUG] ✅ Profissional notificado (cancelamento)')
  } catch (error: any) {
    console.error('[DEBUG] ❌ Erro ao notificar profissional:', error.message)
    // Não lançar erro para não quebrar o fluxo principal
  }
}

// ==========================================
// SOLICITAR FEEDBACK PÓS-ATENDIMENTO
// ==========================================

/**
 * Envia mensagem solicitando feedback após o atendimento
 * 
 * ⚠️ USA TOKEN DO USUÁRIO (não do sistema!)
 * Só funciona se whatsappConectado === true
 * 
 * SUBSTITUI: Webhook N8N 7fa69444-a19a-4a08-8936-5e828e6c12c7
 */
export async function notifyFeedbackRequest(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeServico: string
  feedbackPlatform: 'google' | 'instagram' | 'facebook'
  feedbackLink: string
}): Promise<void> {
  
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    // Mensagem varia conforme plataforma
    let message: string
    
    if (data.feedbackPlatform === 'google') {
      // Google Review
      message = `✨ Olá, ${firstName}! Tudo bem?

Esperamos que sua experiência conosco tenha sido excelente! 💛
A sua opinião é muito importante e nos ajuda a continuar melhorando nossos serviços.

⭐ Deixe sua avaliação aqui:
${data.feedbackLink}

Agradecemos pela confiança! 🙏`
    } else {
      // Redes sociais (Instagram/Facebook)
      message = `💛 Olá, ${firstName}! Tudo bem?

Ficamos muito felizes em tê-lo(a) conosco! 😄
Se quiser, compartilhe sua experiência nas redes sociais e marque nosso perfil. Vamos adorar ver seu feedback! ✨

📸 ${data.feedbackLink}

Muito obrigado(a) pela preferência! 🙌`
    }

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': data.tokenInstancia
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao solicitar feedback: ${error}`)
    }
  } catch (error: any) {
    // Não lançar erro para não quebrar o fluxo principal
  }
}

// ==========================================
// ANIVERSÁRIO DE CLIENTE
// ==========================================

/**
 * Envia mensagem de aniversário para o cliente
 * Templates variam por categoria e são sorteados aleatoriamente
 * 
 * SUBSTITUI: Webhook N8N d0b69658-05f6-4b6c-8cf1-ba0f604b6cb2
 */
export async function notifyBirthday(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeEmpresa: string
  categoriaEmpresa?: string
}): Promise<void> {
  
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    // Templates por categoria
    const templates: Record<string, string[]> = {
      // Clínicas médicas e odontológicas
      ClinicaMedica: [
        `🎉 *Feliz aniversário, ${firstName}!*\nQue este novo ciclo seja repleto de *saúde*, _paz_ e muitas *conquistas*. Você merece um dia lindo!\n_Com carinho,_ *${data.nomeEmpresa}*`,
        `🎂 *Parabéns, ${firstName}!*\nDesejamos que seu dia seja tão especial quanto você é para nós. Muita *saúde* e _felicidade_ sempre!\n💙 *${data.nomeEmpresa}*`,
        `🎈 *Hoje é seu dia, ${firstName}!*\nQue a vida te presenteie com momentos _inesquecíveis_, muita *saúde* e realizações. Feliz aniversário!\n_Equipe_ *${data.nomeEmpresa}*`
      ],
      ClinicaOdontologica: [
        `🎉 *Feliz aniversário, ${firstName}!*\nQue seu sorriso continue *iluminando* o mundo! Desejamos um dia repleto de _alegrias_.\n😁 *${data.nomeEmpresa}*`,
        `🎂 *Parabéns, ${firstName}!*\nQue este novo ano seja cheio de sorrisos *radiantes* e momentos _felizes_. Continue sorrindo!\n✨ *${data.nomeEmpresa}*`,
        `🎈 *Hoje é dia de festa, ${firstName}!*\nDesejamos muita *saúde*, _alegria_ e motivos para sorrir sempre. Feliz aniversário!\n💛 *${data.nomeEmpresa}*`
      ],
      Salao: [
        `🎉 *Feliz aniversário, ${firstName}!*\nQue você brilhe ainda mais neste novo ciclo! Desejamos um dia _maravilhoso_ e cheio de *beleza*.\n💅 *${data.nomeEmpresa}*`,
        `🎂 *Parabéns, ${firstName}!*\nQue sua vida seja tão *linda* quanto você! Muitas _felicidades_ e realizações.\n✨ *${data.nomeEmpresa}*`,
        `🎈 *É aniversário da nossa queridinha!*\nDesejamos, ${firstName}, um dia repleto de *amor*, _luz_ e muita beleza. Você merece!\n💖 *${data.nomeEmpresa}*`
      ],
      Barbearia: [
        `🎉 *Feliz aniversário, ${firstName}!*\nQue este novo ano seja repleto de *sucesso* e _estilo_. Continue sempre no seu melhor!\n✂️ *${data.nomeEmpresa}*`,
        `🎂 *Parabéns, mano!*\nDesejamos, ${firstName}, muitas conquistas e um ano *cheio de atitude*. Tmj sempre!\n🔥 *${data.nomeEmpresa}*`,
        `🎈 *Hoje é seu dia, ${firstName}!*\nQue a vida te dê muitos motivos para comemorar. *Sucesso* e _prosperidade_ sempre!\n👊 *${data.nomeEmpresa}*`
      ],
      // Default para outras categorias
      default: [
        `🎉 *Feliz aniversário, ${firstName}!*\nDesejamos que este novo ciclo seja repleto de *alegrias*, _saúde_ e muitas *conquistas*!\n💛 *${data.nomeEmpresa}*`,
        `🎂 *Parabéns, ${firstName}!*\nQue seu dia seja tão especial quanto você é. Muita *felicidade* e _realizações_!\n✨ *${data.nomeEmpresa}*`,
        `🎈 *Hoje é seu dia, ${firstName}!*\nDesejamos muitas *alegrias*, _paz_ e momentos inesquecíveis. Feliz aniversário!\n🎊 *${data.nomeEmpresa}*`
      ]
    }
    
    // Seleciona templates da categoria ou usa default
    const categoryTemplates = (data.categoriaEmpresa && templates[data.categoriaEmpresa]) || templates.default
    
    // Sorteia um template aleatório  
    const message = categoryTemplates![Math.floor(Math.random() * categoryTemplates!.length)]

    console.log(`📤 Sending birthday message to ${firstName} (${cleanPhone})`);

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': data.tokenInstancia
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error (${response.status}): ${errorText}`)
    }

    console.log(`✅ Birthday message sent to ${firstName}`);
  } catch (error: any) {
    console.error(`❌ Failed to send birthday to ${data.nomeCliente}:`, error.message);
    throw error; // Re-throw para o cron saber que falhou
  }
}

// ==========================================
// LEMBRETE DE RETORNO
// ==========================================

/**
 * Envia lembrete de retorno para o cliente
 * Templates variam por categoria e são sorteados aleatoriamente
 * 
 * SUBSTITUI: Webhook N8N c01c14e1-beea-4ee4-b58d-ea8b433ff6df
 */
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
    
    // Templates por categoria
    const templates: Record<string, string[]> = {
      ClinicaMedica: [
        `⏰ *Olá, ${firstName}!*\nJá se passaram *${data.diasRetorno} dias* desde sua última consulta de _${data.nomeServico}_.\nQue tal agendarmos seu retorno para manter sua *saúde* em dia?\n📅 *${data.nomeEmpresa}*`,
        `🩺 *Oi, ${firstName}!*\nEstá na hora de cuidar da sua saúde novamente! Faz *${data.diasRetorno} dias* desde seu último atendimento.\nVamos agendar? 💙\n*${data.nomeEmpresa}*`,
        `💙 *${firstName}, chegou a hora!*\nJá passaram *${data.diasRetorno} dias* desde sua _${data.nomeServico}_. Sua saúde merece atenção contínua!\n📲 *${data.nomeEmpresa}*`
      ],
      ClinicaOdontologica: [
        `⏰ *Olá, ${firstName}!*\nJá se passaram *${data.diasRetorno} dias* desde sua _${data.nomeServico}_.\nVamos manter seu *sorriso radiante* em dia? Agende seu retorno! 😁\n*${data.nomeEmpresa}*`,
        `🦷 *Oi, ${firstName}!*\nSeu sorriso merece cuidado contínuo! Faz *${data.diasRetorno} dias* desde seu último procedimento.\nQue tal agendarmos? ✨\n*${data.nomeEmpresa}*`,
        `😁 *${firstName}, não esqueça!*\nPassaram-se *${data.diasRetorno} dias* desde sua _${data.nomeServico}_. Vamos cuidar do seu sorriso?\n💛 *${data.nomeEmpresa}*`
      ],
      Salao: [
        `⏰ *Oi, ${firstName}!*\nJá faz *${data.diasRetorno} dias* desde sua última _${data.nomeServico}_!\nQue tal marcarmos para você continuar *linda* sempre? 💅\n*${data.nomeEmpresa}*`,
        `✨ *${firstName}, sentimos sua falta!*\nPassaram *${data.diasRetorno} dias* desde seu último atendimento. Hora de se cuidar novamente!\n💖 *${data.nomeEmpresa}*`,
        `💆‍♀️ *Está na hora, ${firstName}!*\nFaz *${data.diasRetorno} dias* que você não se mima aqui. Vamos agendar seu momento de _beleza_?\n*${data.nomeEmpresa}*`
      ],
      Barbearia: [
        `⏰ *E aí, ${firstName}!*\nJá faz *${data.diasRetorno} dias* desde seu último corte. Hora de renovar o *visual*, mano!\n✂️ *${data.nomeEmpresa}*`,
        `🔥 *${firstName}, bora atualizar o shape?*\nPassaram *${data.diasRetorno} dias* desde sua _${data.nomeServico}_. Vamos agendar?\n*${data.nomeEmpresa}*`,
        `✂️ *Fala, ${firstName}!*\nFaz *${data.diasRetorno} dias* que você não passa aqui. Bora manter o *estilo* sempre top?\n👊 *${data.nomeEmpresa}*`
      ],
      default: [
        `⏰ *Olá, ${firstName}!*\nJá se passaram *${data.diasRetorno} dias* desde sua _${data.nomeServico}_.\nQue tal agendarmos seu retorno para manter os *resultados* sempre em dia?\n*${data.nomeEmpresa}*`,
        `📅 *Oi, ${firstName}!*\nFaz *${data.diasRetorno} dias* desde seu último atendimento. Vamos agendar sua próxima visita?\n✨ *${data.nomeEmpresa}*`,
        `💛 *${firstName}, não esqueça!*\nPassaram *${data.diasRetorno} dias* desde sua _${data.nomeServico}_. Hora de continuar cuidando de você!\n*${data.nomeEmpresa}*`
      ]
    }
    
    // Seleciona templates da categoria ou usa default
    const categoryTemplates = (data.categoriaEmpresa && templates[data.categoriaEmpresa]) || templates.default
    
    // Sorteia um template aleatório  
    const message = categoryTemplates![Math.floor(Math.random() * categoryTemplates!.length)]

    console.log(`📤 Sending return reminder to ${firstName} (${cleanPhone})`);

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': data.tokenInstancia
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error (${response.status}): ${errorText}`)
    }

    console.log(`✅ Return reminder sent to ${firstName}`);
  } catch (error: any) {
    console.error(`❌ Failed to send return reminder to ${data.nomeCliente}:`, error.message);
    throw error; // Re-throw para o cron saber que falhou
  }
}

// ==========================================
// LEMBRETES DE AGENDAMENTO
// ==========================================

/**
 * Envia lembrete 24h antes do agendamento
 */
export async function notifyReminder24h(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeServico: string
  startTime: string
  nomeEmpresa: string
  categoriaEmpresa?: string
}): Promise<void> {
  
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    const message = `*🔔 Lembrete de Atendimento 🔔*

Olá, *${firstName}*! Seu atendimento de *${data.nomeServico}* será *amanhã às ${data.startTime}*.

👉 *Se estiver tudo certo, não precisa responder esta mensagem.*

_${data.nomeEmpresa}_`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': data.tokenInstancia
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      throw new Error(`Erro ao enviar lembrete 24h`)
    }
  } catch (error: any) {
    // Não lançar erro para não quebrar o fluxo
    throw error // Re-throw para o cron saber que falhou
  }
}

/**
 * Envia lembrete 2h antes do agendamento
 */
export async function notifyReminder2h(data: {
  tokenInstancia: string
  telefoneCliente: string | number
  nomeCliente: string
  nomeServico: string
  startTime: string
  nomeEmpresa: string
  categoriaEmpresa?: string
}): Promise<void> {
  
  try {
    const cleanPhone = data.telefoneCliente.toString().replace(/\D/g, '')
    const firstName = data.nomeCliente.split(' ')[0]
    
    const message = `*🔔 Lembrete de Atendimento 🔔*

Olá, *${firstName}*! Seu atendimento de *${data.nomeServico}* será *hoje às ${data.startTime}*.

👉 *Se estiver tudo certo, não precisa responder esta mensagem.*

_${data.nomeEmpresa}_`

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': data.tokenInstancia
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    })

    if (!response.ok) {
      throw new Error(`Erro ao enviar lembrete 2h`)
    }
  } catch (error: any) {
    throw error // Re-throw para o cron saber que falhou
  }
}

// ==========================================
// HELPER: FORMATAR TELEFONE
// ==========================================

/**
 * Formata telefone para EXIBIÇÃO em mensagens (remove DDI 55)
 * Retorna apenas os 11 dígitos: (99) 99999-9999
 */
function formatPhoneForDisplay(phone: string | number): string {
  let clean = phone.toString().replace(/\D/g, '')
  
  // Remover DDI 55 se presente
  if (clean.length === 13 && clean.startsWith('55')) {
    clean = clean.substring(2)
  }
  
  // Limitar a 11 dígitos
  clean = clean.slice(0, 11)
  
  // Formatar: (99) 99999-9999
  if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`
  }
  
  return clean
}

/**
 * Formata telefone para envio (remove caracteres, ajusta 9 extra, etc)
 */
export function formatPhoneForSMS(phone: string | number): string {
  let clean = phone.toString().replace(/\D/g, '')
  
  // Se tem 13 dígitos, remover o 9 extra (5º dígito)
  if (clean.length === 13) {
    clean = clean.substring(0, 4) + clean.substring(5)
  }
  
  // Garantir código do país (55)
  if (clean.length === 11 && !clean.startsWith('55')) {
    clean = '55' + clean
  }
  
  return clean
}
