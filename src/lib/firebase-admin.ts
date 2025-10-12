import admin from 'firebase-admin';

// Impede a reinicialização do app em ambientes de desenvolvimento
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error);
    console.log('Certifique-se de que a variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY está configurada corretamente como um JSON stringified.');
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
