'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore'

// 🔇 Suprimir avisos de OAuth em desenvolvimento local
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalConsoleInfo = console.info;
  console.info = function(...args) {
    // Ignorar avisos de OAuth em desenvolvimento local (IP local)
    if (args[0]?.includes?.('not authorized for OAuth operations')) {
      return; // Silenciar este aviso específico
    }
    originalConsoleInfo.apply(console, args);
  };
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Silently fall back to config (normal behavior during build/dev)
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Usar cache em MEMÓRIA (sem IndexedDB que trava no Windows)
  let firestore;
  
  try {
    // Tentar inicializar com cache em memória (muito mais rápido)
    if (typeof window !== 'undefined') {
      firestore = initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache()
      });
    } else {
      firestore = getFirestore(firebaseApp);
    }
  } catch (error) {
    // Se já foi inicializado, usar getFirestore
    firestore = getFirestore(firebaseApp);
  }
  
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
