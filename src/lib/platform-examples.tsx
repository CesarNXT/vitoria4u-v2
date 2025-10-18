/**
 * 📱 EXEMPLOS DE USO - Platform Abstractions
 * 
 * Este arquivo mostra como usar as abstrações de plataforma
 * para criar código que funciona tanto em Web quanto em Mobile.
 */

import { 
  useNavigation, 
  storage, 
  clipboard, 
  Platform, 
  linking,
  useDimensions,
  permissions 
} from './platform';

// ==========================================
// EXEMPLO 1: NAVEGAÇÃO
// ==========================================

export function ExampleNavigation() {
  const navigation = useNavigation();
  
  const handleGoToDashboard = () => {
    // ✅ Funciona em Web e Mobile
    navigation.push('/dashboard');
  };
  
  const handleGoBack = () => {
    // ✅ Funciona em Web e Mobile
    navigation.back();
  };
  
  const handleReplaceRoute = () => {
    // ✅ Funciona em Web e Mobile
    navigation.replace('/login');
  };
  
  return (
    <div>
      <button onClick={handleGoToDashboard}>Ir para Dashboard</button>
      <button onClick={handleGoBack}>Voltar</button>
      <button onClick={handleReplaceRoute}>Substituir Rota</button>
    </div>
  );
}

// ==========================================
// EXEMPLO 2: STORAGE ASSÍNCRONO
// ==========================================

export function ExampleStorage() {
  const saveUserData = async () => {
    // ✅ Funciona em Web (localStorage) e Mobile (AsyncStorage)
    await storage.setItem('user_id', '123');
    await storage.setItem('user_name', 'João Silva');
  };
  
  const loadUserData = async () => {
    // ✅ Funciona em Web e Mobile
    const userId = await storage.getItem('user_id');
    const userName = await storage.getItem('user_name');
    
    console.log('User:', userId, userName);
  };
  
  const clearData = async () => {
    // ✅ Funciona em Web e Mobile
    await storage.removeItem('user_id');
    // ou limpar tudo:
    await storage.clear();
  };
  
  return (
    <div>
      <button onClick={saveUserData}>Salvar Dados</button>
      <button onClick={loadUserData}>Carregar Dados</button>
      <button onClick={clearData}>Limpar Dados</button>
    </div>
  );
}

// ==========================================
// EXEMPLO 3: CLIPBOARD
// ==========================================

export function ExampleClipboard() {
  const handleCopyToClipboard = async () => {
    // ✅ Funciona em Web e Mobile
    const success = await clipboard.copy('Texto copiado!');
    
    if (success) {
      alert('Copiado com sucesso!');
    }
  };
  
  const handlePasteFromClipboard = async () => {
    // ✅ Funciona em Web e Mobile
    const text = await clipboard.paste();
    console.log('Texto colado:', text);
  };
  
  return (
    <div>
      <button onClick={handleCopyToClipboard}>Copiar Texto</button>
      <button onClick={handlePasteFromClipboard}>Colar Texto</button>
    </div>
  );
}

// ==========================================
// EXEMPLO 4: PLATFORM DETECTION
// ==========================================

export function ExamplePlatformDetection() {
  // ✅ Detectar plataforma
  const platformName = Platform.OS;
  const isRunningOnWeb = Platform.isWeb;
  const isRunningOnMobile = Platform.isMobile;
  
  // ✅ Renderizar condicionalmente baseado na plataforma
  const buttonText = Platform.select({
    web: 'Clique aqui (Web)',
    ios: 'Toque aqui (iOS)',
    android: 'Toque aqui (Android)',
    default: 'Pressione aqui'
  });
  
  // ✅ Estilos diferentes por plataforma
  const fontSize = Platform.select({
    web: 16,
    ios: 17,
    android: 15,
    default: 16
  });
  
  return (
    <div>
      <p>Plataforma: {platformName}</p>
      <p>É Web? {isRunningOnWeb ? 'Sim' : 'Não'}</p>
      <p>É Mobile? {isRunningOnMobile ? 'Sim' : 'Não'}</p>
      <button style={{ fontSize }}>{buttonText}</button>
    </div>
  );
}

// ==========================================
// EXEMPLO 5: DEEP LINKS / URLs EXTERNAS
// ==========================================

export function ExampleLinking() {
  const handleOpenWebsite = async () => {
    // ✅ Funciona em Web e Mobile
    await linking.openURL('https://www.google.com');
  };
  
  const handleOpenWhatsApp = async () => {
    // ✅ Funciona em Web e Mobile
    const phoneNumber = '5511999999999';
    const message = 'Olá!';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    const canOpen = await linking.canOpenURL(url);
    if (canOpen) {
      await linking.openURL(url);
    }
  };
  
  const handleOpenEmail = async () => {
    // ✅ Funciona em Web e Mobile
    await linking.openURL('mailto:contato@exemplo.com?subject=Assunto&body=Mensagem');
  };
  
  return (
    <div>
      <button onClick={handleOpenWebsite}>Abrir Site</button>
      <button onClick={handleOpenWhatsApp}>Abrir WhatsApp</button>
      <button onClick={handleOpenEmail}>Abrir Email</button>
    </div>
  );
}

// ==========================================
// EXEMPLO 6: DIMENSÕES DA TELA
// ==========================================

export function ExampleDimensions() {
  const { width, height } = useDimensions();
  
  // ✅ Responsive design cross-platform
  const isSmallScreen = width < 768;
  const columns = isSmallScreen ? 1 : 2;
  
  return (
    <div>
      <p>Largura: {width}px</p>
      <p>Altura: {height}px</p>
      <p>Tela pequena? {isSmallScreen ? 'Sim' : 'Não'}</p>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)` 
      }}>
        <div>Coluna 1</div>
        <div>Coluna 2</div>
      </div>
    </div>
  );
}

// ==========================================
// EXEMPLO 7: PERMISSÕES
// ==========================================

export function ExamplePermissions() {
  const handleRequestCameraPermission = async () => {
    // ✅ Funciona em Web e Mobile
    const status = await permissions.camera();
    
    if (status === 'granted') {
      console.log('Câmera autorizada!');
      // Abrir câmera...
    } else if (status === 'denied') {
      alert('Você negou acesso à câmera');
    } else {
      alert('Permissão não determinada');
    }
  };
  
  const handleRequestLocationPermission = async () => {
    // ✅ Funciona em Web e Mobile
    const status = await permissions.location();
    
    if (status === 'granted') {
      console.log('Localização autorizada!');
      // Obter localização...
    }
  };
  
  const handleRequestNotificationPermission = async () => {
    // ✅ Funciona em Web e Mobile
    const status = await permissions.notifications();
    
    if (status === 'granted') {
      console.log('Notificações autorizadas!');
      // Enviar notificações...
    }
  };
  
  return (
    <div>
      <button onClick={handleRequestCameraPermission}>
        Solicitar Câmera
      </button>
      <button onClick={handleRequestLocationPermission}>
        Solicitar Localização
      </button>
      <button onClick={handleRequestNotificationPermission}>
        Solicitar Notificações
      </button>
    </div>
  );
}

// ==========================================
// EXEMPLO 8: HOOK CUSTOMIZADO CROSS-PLATFORM
// ==========================================

import { useState, useEffect } from 'react';

export function useImpersonation() {
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);
  
  useEffect(() => {
    // ✅ Carregar de forma assíncrona (funciona em Web e Mobile)
    const loadImpersonation = async () => {
      const id = await storage.getItem('impersonatedBusinessId');
      setImpersonatedId(id);
    };
    
    loadImpersonation();
  }, []);
  
  const startImpersonation = async (businessId: string) => {
    // ✅ Salvar de forma assíncrona
    await storage.setItem('impersonatedBusinessId', businessId);
    setImpersonatedId(businessId);
  };
  
  const stopImpersonation = async () => {
    // ✅ Remover de forma assíncrona
    await storage.removeItem('impersonatedBusinessId');
    setImpersonatedId(null);
  };
  
  return {
    impersonatedId,
    startImpersonation,
    stopImpersonation,
    isImpersonating: !!impersonatedId
  };
}

// ==========================================
// EXEMPLO 9: COMPONENTE RESPONSIVO COMPLETO
// ==========================================

export function ResponsiveCard() {
  const { width } = useDimensions();
  const navigation = useNavigation();
  
  // ✅ Layout responsivo cross-platform
  const isMobile = width < 768;
  const cardPadding = isMobile ? 16 : 24;
  const fontSize = isMobile ? 14 : 16;
  
  const handleShare = async () => {
    // ✅ Copiar link (funciona em ambos)
    await clipboard.copy('https://app.exemplo.com/produto/123');
    
    // ✅ Abrir compartilhamento nativo (mobile) ou copiar (web)
    if (Platform.isMobile) {
      // No mobile: usar Share API nativa
      // await Share.share({ message: 'Confira este produto!' });
    } else {
      alert('Link copiado!');
    }
  };
  
  const handleNavigate = () => {
    navigation.push('/detalhes');
  };
  
  return (
    <div style={{ padding: cardPadding }}>
      <h2 style={{ fontSize: fontSize + 4 }}>Produto</h2>
      <p style={{ fontSize }}>Descrição do produto</p>
      
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={handleNavigate}>Ver Detalhes</button>
        <button onClick={handleShare}>Compartilhar</button>
      </div>
    </div>
  );
}

// ==========================================
// EXEMPLO 10: AUTENTICAÇÃO CROSS-PLATFORM
// ==========================================

export function useAuth() {
  const navigation = useNavigation();
  
  const login = async (email: string, password: string) => {
    // ✅ Firebase Auth funciona igual em Web e Mobile
    // await signInWithEmailAndPassword(auth, email, password);
    
    // ✅ Salvar token de forma cross-platform
    await storage.setItem('auth_token', 'token_123');
    
    // ✅ Navegar de forma cross-platform
    navigation.replace('/dashboard');
  };
  
  const logout = async () => {
    // ✅ Limpar dados de forma cross-platform
    await storage.removeItem('auth_token');
    await storage.removeItem('user_data');
    
    // ✅ Navegar de forma cross-platform
    navigation.replace('/login');
  };
  
  const checkAuth = async (): Promise<boolean> => {
    // ✅ Verificar token de forma cross-platform
    const token = await storage.getItem('auth_token');
    return !!token;
  };
  
  return { login, logout, checkAuth };
}
