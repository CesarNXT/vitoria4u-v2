/**
 * Sistema de Testes Automatizados - Vitoria4U
 * 
 * Este arquivo contém testes para todas as funcionalidades do sistema
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// Configuração de teste
const TEST_CONFIG = {
  testEmail: `test_${Date.now()}@example.com`,
  testPassword: 'TestPassword123!',
  testBusinessName: 'Negócio de Teste',
  testPhone: '11999999999'
};

// Interface para resultados de teste
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  time?: number;
}

class SystemTester {
  private auth: any;
  private firestore: any;
  private results: TestResult[] = [];
  private currentUser: any = null;

  constructor() {
    // Inicializar Firebase (usar suas credenciais reais)
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
    this.firestore = getFirestore(app);
  }

  // ===== TESTES DE AUTENTICAÇÃO =====
  
  async testUserRegistration(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando cadastro de usuário...');
      
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        TEST_CONFIG.testEmail,
        TEST_CONFIG.testPassword
      );
      
      this.currentUser = userCredential.user;
      
      // Criar documento do negócio
      await setDoc(doc(this.firestore, 'negocios', userCredential.user.uid), {
        nome: TEST_CONFIG.testBusinessName,
        telefone: TEST_CONFIG.testPhone,
        email: TEST_CONFIG.testEmail,
        setupCompleted: false,
        criadoEm: new Date(),
        plano: 'free',
        expiracaoPlano: null
      });
      
      return {
        name: 'Cadastro de Usuário',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Cadastro de Usuário',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  async testUserLogin(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando login...');
      
      await signOut(this.auth);
      
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        TEST_CONFIG.testEmail,
        TEST_CONFIG.testPassword
      );
      
      this.currentUser = userCredential.user;
      
      return {
        name: 'Login de Usuário',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Login de Usuário',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  async testPasswordReset(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando reset de senha...');
      
      await sendPasswordResetEmail(this.auth, TEST_CONFIG.testEmail);
      
      return {
        name: 'Reset de Senha',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Reset de Senha',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  // ===== TESTES DE CONFIGURAÇÃO DO NEGÓCIO =====
  
  async testBusinessSetup(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando configuração do negócio...');
      
      if (!this.currentUser) {
        throw new Error('Usuário não está logado');
      }
      
      const businessData = {
        nome: 'Salão Teste Completo',
        telefone: '11987654321',
        endereco: 'Rua Teste, 123',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
        horarioAbertura: '08:00',
        horarioFechamento: '18:00',
        diasFuncionamento: ['seg', 'ter', 'qua', 'qui', 'sex'],
        intervaloAgendamento: 30,
        setupCompleted: true,
        atualizadoEm: new Date()
      };
      
      await updateDoc(
        doc(this.firestore, 'negocios', this.currentUser.uid),
        businessData
      );
      
      return {
        name: 'Configuração do Negócio',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Configuração do Negócio',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  // ===== TESTES DE SERVIÇOS =====
  
  async testServiceCreation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando criação de serviços...');
      
      if (!this.currentUser) {
        throw new Error('Usuário não está logado');
      }
      
      const services = [
        { nome: 'Corte de Cabelo', preco: 50, duracao: 30 },
        { nome: 'Manicure', preco: 35, duracao: 45 },
        { nome: 'Pedicure', preco: 40, duracao: 45 }
      ];
      
      for (const service of services) {
        await addDoc(
          collection(this.firestore, `negocios/${this.currentUser.uid}/servicos`),
          {
            ...service,
            ativo: true,
            criadoEm: new Date()
          }
        );
      }
      
      return {
        name: 'Criação de Serviços',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Criação de Serviços',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  // ===== TESTES DE PROFISSIONAIS =====
  
  async testProfessionalCreation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando criação de profissionais...');
      
      if (!this.currentUser) {
        throw new Error('Usuário não está logado');
      }
      
      const professionals = [
        { nome: 'João Silva', especialidades: ['Corte'], telefone: '11999998888' },
        { nome: 'Maria Santos', especialidades: ['Manicure', 'Pedicure'], telefone: '11999997777' }
      ];
      
      for (const prof of professionals) {
        await addDoc(
          collection(this.firestore, `negocios/${this.currentUser.uid}/profissionais`),
          {
            ...prof,
            ativo: true,
            criadoEm: new Date()
          }
        );
      }
      
      return {
        name: 'Criação de Profissionais',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Criação de Profissionais',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  // ===== TESTES DE CLIENTES =====
  
  async testClientCreation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando criação de clientes...');
      
      if (!this.currentUser) {
        throw new Error('Usuário não está logado');
      }
      
      const clients = [
        { nome: 'Cliente Teste 1', telefone: '11999996666', email: 'cliente1@test.com' },
        { nome: 'Cliente Teste 2', telefone: '11999995555', email: 'cliente2@test.com' }
      ];
      
      for (const client of clients) {
        await addDoc(
          collection(this.firestore, `negocios/${this.currentUser.uid}/clientes`),
          {
            ...client,
            dataNascimento: null,
            observacoes: '',
            criadoEm: new Date()
          }
        );
      }
      
      return {
        name: 'Criação de Clientes',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Criação de Clientes',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  // ===== TESTES DE AGENDAMENTOS =====
  
  async testAppointmentCreation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🧪 Testando criação de agendamentos...');
      
      if (!this.currentUser) {
        throw new Error('Usuário não está logado');
      }
      
      // Buscar IDs necessários
      const servicesSnapshot = await getDocs(
        collection(this.firestore, `negocios/${this.currentUser.uid}/servicos`)
      );
      const profSnapshot = await getDocs(
        collection(this.firestore, `negocios/${this.currentUser.uid}/profissionais`)
      );
      const clientSnapshot = await getDocs(
        collection(this.firestore, `negocios/${this.currentUser.uid}/clientes`)
      );
      
      if (servicesSnapshot.empty || profSnapshot.empty || clientSnapshot.empty) {
        throw new Error('Dados necessários não encontrados');
      }
      
      const serviceId = servicesSnapshot.docs[0].id;
      const profId = profSnapshot.docs[0].id;
      const clientId = clientSnapshot.docs[0].id;
      
      const appointment = {
        clienteId: clientId,
        servicoId: serviceId,
        profissionalId: profId,
        data: new Date(Date.now() + 24 * 60 * 60 * 1000), // Amanhã
        horario: '14:00',
        duracao: 30,
        status: 'confirmado',
        valor: 50,
        observacoes: 'Agendamento de teste',
        criadoEm: new Date()
      };
      
      await addDoc(
        collection(this.firestore, `negocios/${this.currentUser.uid}/agendamentos`),
        appointment
      );
      
      return {
        name: 'Criação de Agendamentos',
        status: 'passed',
        time: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        name: 'Criação de Agendamentos',
        status: 'failed',
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  // ===== TESTE DE LIMPEZA =====
  
  async cleanup(): Promise<void> {
    console.log('🧹 Limpando dados de teste...');
    
    try {
      if (this.currentUser) {
        // Deletar todas as subcoleções
        const collections = ['servicos', 'profissionais', 'clientes', 'agendamentos'];
        
        for (const col of collections) {
          const snapshot = await getDocs(
            collection(this.firestore, `negocios/${this.currentUser.uid}/${col}`)
          );
          
          for (const doc of snapshot.docs) {
            await deleteDoc(doc.ref);
          }
        }
        
        // Deletar documento do negócio
        await deleteDoc(doc(this.firestore, 'negocios', this.currentUser.uid));
        
        // Deletar usuário
        await this.currentUser.delete();
      }
    } catch (error) {
      console.error('Erro na limpeza:', error);
    }
  }

  // ===== EXECUTAR TODOS OS TESTES =====
  
  async runAllTests(): Promise<void> {
    console.log('🚀 Iniciando testes automatizados do sistema Vitoria4U');
    console.log('================================================');
    
    const tests = [
      () => this.testUserRegistration(),
      () => this.testUserLogin(),
      () => this.testPasswordReset(),
      () => this.testBusinessSetup(),
      () => this.testServiceCreation(),
      () => this.testProfessionalCreation(),
      () => this.testClientCreation(),
      () => this.testAppointmentCreation()
    ];
    
    for (const test of tests) {
      const result = await test();
      this.results.push(result);
      
      if (result.status === 'passed') {
        console.log(`✅ ${result.name} - PASSOU (${result.time}ms)`);
      } else {
        console.log(`❌ ${result.name} - FALHOU: ${result.error}`);
      }
    }
    
    // Limpar dados de teste
    await this.cleanup();
    
    // Relatório final
    console.log('\n================================================');
    console.log('📊 RELATÓRIO FINAL');
    console.log('================================================');
    
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const totalTime = this.results.reduce((acc, r) => acc + (r.time || 0), 0);
    
    console.log(`✅ Testes aprovados: ${passed}`);
    console.log(`❌ Testes falhados: ${failed}`);
    console.log(`⏱️ Tempo total: ${totalTime}ms`);
    console.log(`📈 Taxa de sucesso: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Testes que falharam:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
  }
}

// Exportar para uso
export default SystemTester;

// Para executar os testes:
// const tester = new SystemTester();
// await tester.runAllTests();
