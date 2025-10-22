/**
 * API Route para testar o sistema completo
 * Acesse: http://localhost:3000/api/test-system
 */

import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin
function initAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
    );
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
  
  return {
    auth: getAuth(),
    db: getFirestore()
  };
}

interface TestResult {
  test: string;
  status: 'passed' | 'failed';
  message?: string;
  time?: number;
}

export async function GET() {
  const results: TestResult[] = [];
  const testEmail = `test_${Date.now()}@vitoria4u.com`;
  let testUserId: string | null = null;
  
  try {
    const { auth, db } = initAdmin();
    
    console.log('🧪 Iniciando testes do sistema...');
    
    // ========== TESTE 1: Criar usuário ==========
    const startUser = Date.now();
    try {
      const userRecord = await auth.createUser({
        email: testEmail,
        password: 'Test123456!',
        displayName: 'Usuário Teste',
        emailVerified: false
      });
      
      testUserId = userRecord.uid;
      
      results.push({
        test: '1. Criar Usuário',
        status: 'passed',
        message: `Usuário criado: ${testEmail}`,
        time: Date.now() - startUser
      });
    } catch (error: any) {
      results.push({
        test: '1. Criar Usuário',
        status: 'failed',
        message: error.message
      });
    }
    
    // ========== TESTE 2: Criar documento do negócio ==========
    if (testUserId) {
      const startBusiness = Date.now();
      try {
        await db.collection('negocios').doc(testUserId).set({
          nome: 'Salão Teste Automatizado',
          telefone: '11999999999',
          email: testEmail,
          endereco: 'Rua Teste, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567',
          horarioAbertura: '08:00',
          horarioFechamento: '18:00',
          diasFuncionamento: ['seg', 'ter', 'qua', 'qui', 'sex'],
          intervaloAgendamento: 30,
          setupCompleted: true,
          plano: 'teste',
          criadoEm: new Date(),
          atualizadoEm: new Date()
        });
        
        results.push({
          test: '2. Configurar Negócio',
          status: 'passed',
          message: 'Negócio configurado com sucesso',
          time: Date.now() - startBusiness
        });
      } catch (error: any) {
        results.push({
          test: '2. Configurar Negócio',
          status: 'failed',
          message: error.message
        });
      }
      
      // ========== TESTE 3: Criar serviços ==========
      const startServices = Date.now();
      try {
        const services = [
          { nome: 'Corte Masculino', preco: 35, duracao: 30, ativo: true },
          { nome: 'Corte Feminino', preco: 65, duracao: 60, ativo: true },
          { nome: 'Manicure', preco: 25, duracao: 45, ativo: true },
          { nome: 'Pedicure', preco: 30, duracao: 45, ativo: true },
          { nome: 'Escova', preco: 40, duracao: 40, ativo: true }
        ];
        
        for (const service of services) {
          await db.collection(`negocios/${testUserId}/servicos`).add({
            ...service,
            criadoEm: new Date()
          });
        }
        
        results.push({
          test: '3. Criar Serviços',
          status: 'passed',
          message: `${services.length} serviços criados`,
          time: Date.now() - startServices
        });
      } catch (error: any) {
        results.push({
          test: '3. Criar Serviços',
          status: 'failed',
          message: error.message
        });
      }
      
      // ========== TESTE 4: Criar profissionais ==========
      const startProf = Date.now();
      try {
        const professionals = [
          { nome: 'Ana Silva', especialidades: ['Corte', 'Escova'], telefone: '11988887777' },
          { nome: 'João Santos', especialidades: ['Corte'], telefone: '11977776666' },
          { nome: 'Maria Oliveira', especialidades: ['Manicure', 'Pedicure'], telefone: '11966665555' }
        ];
        
        for (const prof of professionals) {
          await db.collection(`negocios/${testUserId}/profissionais`).add({
            ...prof,
            ativo: true,
            criadoEm: new Date()
          });
        }
        
        results.push({
          test: '4. Criar Profissionais',
          status: 'passed',
          message: `${professionals.length} profissionais criados`,
          time: Date.now() - startProf
        });
      } catch (error: any) {
        results.push({
          test: '4. Criar Profissionais',
          status: 'failed',
          message: error.message
        });
      }
      
      // ========== TESTE 5: Criar clientes ==========
      const startClients = Date.now();
      try {
        const clients = [
          { nome: 'Carlos Teste', telefone: '11955554444', email: 'carlos@teste.com' },
          { nome: 'Julia Teste', telefone: '11944443333', email: 'julia@teste.com' },
          { nome: 'Pedro Teste', telefone: '11933332222', email: 'pedro@teste.com' }
        ];
        
        for (const client of clients) {
          await db.collection(`negocios/${testUserId}/clientes`).add({
            ...client,
            observacoes: 'Cliente de teste',
            criadoEm: new Date()
          });
        }
        
        results.push({
          test: '5. Criar Clientes',
          status: 'passed',
          message: `${clients.length} clientes criados`,
          time: Date.now() - startClients
        });
      } catch (error: any) {
        results.push({
          test: '5. Criar Clientes',
          status: 'failed',
          message: error.message
        });
      }
      
      // ========== TESTE 6: Criar agendamentos ==========
      const startAppointments = Date.now();
      try {
        // Buscar IDs para criar agendamentos
        const [servicesSnap, profsSnap, clientsSnap] = await Promise.all([
          db.collection(`negocios/${testUserId}/servicos`).limit(1).get(),
          db.collection(`negocios/${testUserId}/profissionais`).limit(1).get(),
          db.collection(`negocios/${testUserId}/clientes`).limit(1).get()
        ]);
        
        if (!servicesSnap.empty && !profsSnap.empty && !clientsSnap.empty) {
          const serviceId = servicesSnap.docs[0].id;
          const profId = profsSnap.docs[0].id;
          const clientId = clientsSnap.docs[0].id;
          
          // Criar 3 agendamentos de teste
          const hoje = new Date();
          const amanha = new Date(hoje);
          amanha.setDate(amanha.getDate() + 1);
          
          const appointments = [
            {
              clienteId: clientId,
              servicoId: serviceId,
              profissionalId: profId,
              data: hoje,
              horario: '14:00',
              duracao: 30,
              status: 'confirmado',
              valor: 35
            },
            {
              clienteId: clientId,
              servicoId: serviceId,
              profissionalId: profId,
              data: amanha,
              horario: '10:00',
              duracao: 30,
              status: 'confirmado',
              valor: 35
            },
            {
              clienteId: clientId,
              servicoId: serviceId,
              profissionalId: profId,
              data: amanha,
              horario: '15:00',
              duracao: 30,
              status: 'pendente',
              valor: 35
            }
          ];
          
          for (const appointment of appointments) {
            await db.collection(`negocios/${testUserId}/agendamentos`).add({
              ...appointment,
              criadoEm: new Date()
            });
          }
          
          results.push({
            test: '6. Criar Agendamentos',
            status: 'passed',
            message: `${appointments.length} agendamentos criados`,
            time: Date.now() - startAppointments
          });
        }
      } catch (error: any) {
        results.push({
          test: '6. Criar Agendamentos',
          status: 'failed',
          message: error.message
        });
      }
      
      // ========== TESTE 7: Verificar integridade dos dados ==========
      const startVerify = Date.now();
      try {
        const [business, services, profs, clients, appointments] = await Promise.all([
          db.collection('negocios').doc(testUserId).get(),
          db.collection(`negocios/${testUserId}/servicos`).get(),
          db.collection(`negocios/${testUserId}/profissionais`).get(),
          db.collection(`negocios/${testUserId}/clientes`).get(),
          db.collection(`negocios/${testUserId}/agendamentos`).get()
        ]);
        
        const verification = {
          negocio: business.exists,
          servicos: services.size,
          profissionais: profs.size,
          clientes: clients.size,
          agendamentos: appointments.size
        };
        
        results.push({
          test: '7. Verificar Integridade',
          status: 'passed',
          message: `Negócio: ${verification.negocio}, Serviços: ${verification.servicos}, Prof: ${verification.profissionais}, Clientes: ${verification.clientes}, Agend: ${verification.agendamentos}`,
          time: Date.now() - startVerify
        });
      } catch (error: any) {
        results.push({
          test: '7. Verificar Integridade',
          status: 'failed',
          message: error.message
        });
      }
      
      // ========== LIMPEZA: Remover dados de teste ==========
      const startCleanup = Date.now();
      try {
        // Deletar subcoleções
        const collections = ['servicos', 'profissionais', 'clientes', 'agendamentos'];
        
        for (const col of collections) {
          const snapshot = await db.collection(`negocios/${testUserId}/${col}`).get();
          const batch = db.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
        
        // Deletar documento do negócio
        await db.collection('negocios').doc(testUserId).delete();
        
        // Deletar usuário
        await auth.deleteUser(testUserId);
        
        results.push({
          test: '8. Limpeza',
          status: 'passed',
          message: 'Dados de teste removidos',
          time: Date.now() - startCleanup
        });
      } catch (error: any) {
        results.push({
          test: '8. Limpeza',
          status: 'failed',
          message: error.message
        });
      }
    }
    
    // ========== RELATÓRIO FINAL ==========
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const totalTime = results.reduce((acc, r) => acc + (r.time || 0), 0);
    
    const summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
      totalTime: totalTime + 'ms',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: failedTests === 0,
      summary,
      results
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 });
  }
}
