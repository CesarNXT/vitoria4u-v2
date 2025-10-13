import admin from 'firebase-admin';

// Inicialização resiliente do Firebase Admin SDK
// 1) Se FIREBASE_SERVICE_ACCOUNT_KEY existir: usa credenciais do serviço
// 2) Caso contrário: usa Application Default Credentials (ADC), disponível no ambiente de hosting
// 3) Em último caso, evita quebrar o build garantindo uma app inicializada sem credenciais explícitas
if (!admin.apps.length) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (raw) {
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Tenta ADC (por exemplo, no Firebase App Hosting / GCP)
      admin.initializeApp();
    }
    console.log('Firebase Admin SDK inicializado.');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK (tentativa 1):', error);
    // Fallback final: tenta inicializar sem credenciais explícitas
    try {
      if (!admin.apps.length) {
        admin.initializeApp();
        console.warn('Firebase Admin SDK inicializado via ADC (fallback).');
      }
    } catch (fallbackError) {
      console.error('Falha ao inicializar Firebase Admin SDK (fallback):', fallbackError);
      console.error('Verifique FIREBASE_SERVICE_ACCOUNT_KEY (JSON stringified) ou ADC no ambiente.');
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
