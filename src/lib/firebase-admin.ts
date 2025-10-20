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
      // Log apenas em dev
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase Admin SDK inicializado com Service Account');
      }
    } else {
      // Tenta ADC (Firebase App Hosting / GCP)
      admin.initializeApp();
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase Admin SDK inicializado via ADC');
      }
    }
  } catch (error) {
    // Fallback silencioso (normal durante build estático)
    try {
      if (!admin.apps.length) {
        admin.initializeApp();
      }
    } catch (fallbackError) {
      // Só loga erro se não for build
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Falha ao inicializar Firebase Admin SDK:', fallbackError);
      }
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
