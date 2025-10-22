import admin from 'firebase-admin';

// Inicialização resiliente do Firebase Admin SDK
// 1) Se FIREBASE_SERVICE_ACCOUNT_KEY existir: usa credenciais do serviço
// 2) Caso contrário: usa Application Default Credentials (ADC), disponível no ambiente de hosting
// 3) Em último caso, evita quebrar o build garantindo uma app inicializada sem credenciais explícitas

let initializationError: Error | null = null;

if (!admin.apps.length) {
  try {
    console.log('[Firebase Admin] Inicializando...');
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      console.log('[Firebase Admin] Usando credenciais de service account');
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('[Firebase Admin] ✅ Inicializado com sucesso usando service account');
      } catch (parseError) {
        console.error('[Firebase Admin] ❌ Erro ao parsear service account key:', parseError);
        throw parseError;
      }
    } else {
      // Tenta ADC (Firebase App Hosting / GCP)
      console.log('[Firebase Admin] Tentando usar Application Default Credentials (ADC)');
      admin.initializeApp();
      console.log('[Firebase Admin] ✅ Inicializado com sucesso usando ADC');
    }
  } catch (error) {
    initializationError = error instanceof Error ? error : new Error(String(error));
    console.error('[Firebase Admin] ❌ Falha ao inicializar Firebase Admin SDK:', {
      error: initializationError.message,
      stack: initializationError.stack,
      hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      nodeEnv: process.env.NODE_ENV
    });
  }
} else {
  console.log('[Firebase Admin] Já inicializado');
}

// Exporta instâncias, mas adiciona validação
function getAdminDb() {
  if (initializationError) {
    console.error('[Firebase Admin] Tentando usar adminDb mas inicialização falhou:', initializationError.message);
    throw new Error(`Firebase Admin não inicializado: ${initializationError.message}`);
  }
  return admin.firestore();
}

function getAdminAuth() {
  if (initializationError) {
    console.error('[Firebase Admin] Tentando usar adminAuth mas inicialização falhou:', initializationError.message);
    throw new Error(`Firebase Admin não inicializado: ${initializationError.message}`);
  }
  return admin.auth();
}

function getAdminStorage() {
  if (initializationError) {
    console.error('[Firebase Admin] Tentando usar adminStorage mas inicialização falhou:', initializationError.message);
    throw new Error(`Firebase Admin não inicializado: ${initializationError.message}`);
  }
  return admin.storage();
}

export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();
export const adminStorage = getAdminStorage();
