import admin from 'firebase-admin';

// Inicialização resiliente do Firebase Admin SDK
// 1) Se FIREBASE_SERVICE_ACCOUNT_KEY existir: usa credenciais do serviço
// 2) Caso contrário: usa Application Default Credentials (ADC), disponível no ambiente de hosting
// 3) Em último caso, evita quebrar o build garantindo uma app inicializada sem credenciais explícitas
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Tenta ADC (Firebase App Hosting / GCP)
      admin.initializeApp();
    }
  } catch (error) {
      console.error('❌ Falha ao inicializar Firebase Admin SDK:', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
