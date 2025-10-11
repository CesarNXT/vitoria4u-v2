
'use client'

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFirebase, FirebaseClientProvider } from "@/firebase"
import { checkIsAdmin } from './actions'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, Gem, Eye, EyeOff } from "lucide-react"
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from "firebase/auth"
import { doc, getDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { getSystemConfig } from '@/lib/firestore';
import { useToast } from "@/hooks/use-toast"
import { addDays } from 'date-fns';
import { Separator } from "@/components/ui/separator"

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.655-3.411-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.24,44,30.338,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);


const handleFirebaseAuthError = (firebaseError: any, setError: (message: string) => void) => {
    switch (firebaseError.code) {
        case 'auth/invalid-email':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
             setError("E-mail ou senha inválidos.");
             break;
        case 'auth/email-already-in-use':
            setError("Este e-mail já está em uso por outra conta.");
            break;
        case 'auth/weak-password':
            setError("A senha é muito fraca. Use pelo menos 6 caracteres.");
            break;
        case 'auth/too-many-requests':
            setError("Muitas tentativas falharam. Tente novamente mais tarde.");
            break;
        case 'auth/popup-closed-by-user':
            // Não mostrar erro, apenas registrar no console
            console.log("Login com Google cancelado pelo usuário.");
            break;
        default:
            console.error("Firebase Auth Error:", firebaseError);
            setError("Ocorreu um erro desconhecido.");
            break;
    }
}

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { auth, firestore } = useFirebase();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoginView, setIsLoginView] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (isLoginView) {
            try {
                const { isAdmin } = await checkIsAdmin(email);
                if (isAdmin) {
                    setError("Este é um e-mail de administrador. Por favor, acesse /admin para fazer login.");
                    setIsLoading(false);
                    return;
                }

                await signInWithEmailAndPassword(auth, email, password);
                toast({
                    title: "Login realizado com sucesso!",
                    description: "Redirecionando para o dashboard...",
                });
                router.push('/dashboard');
            } catch (firebaseError: any) {
                handleFirebaseAuthError(firebaseError, setError);
            } finally {
                setIsLoading(false);
            }
        } else {
            if (password !== confirmPassword) {
                setError("As senhas não coincidem.");
                setIsLoading(false);
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const newUser = userCredential.user;
                
                // Buscar configurações do sistema para período de teste
                const systemConfig = await getSystemConfig();
                const trialEndDate = systemConfig.trial.enabled 
                    ? addDays(new Date(), systemConfig.trial.days)
                    : new Date(); // Se teste desabilitado, expira imediatamente

                const newBusinessData: Partial<ConfiguracoesNegocio> = {
                    nome: '', // Ensure name is empty to trigger setup
                    email: newUser.email || undefined,
                    createdAt: new Date(), 
                    planId: systemConfig.trial.enabled ? systemConfig.trial.planId : 'plano_gratis',
                    whatsappConectado: false,
                    access_expires_at: trialEndDate,
                };

                const businessDocRef = doc(firestore, `negocios/${newUser.uid}`);
                await setDocumentNonBlocking(businessDocRef, newBusinessData, { merge: true });

                toast({ title: "Conta criada com sucesso!", description: "Você será redirecionado para a configuração inicial." });
                router.push('/configuracoes');
            } catch (firebaseError: any) {
                handleFirebaseAuthError(firebaseError, setError);
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError(null);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const additionalInfo = getAdditionalUserInfo(result);

            if (additionalInfo?.isNewUser) {
                // Buscar configurações do sistema para período de teste
                const systemConfig = await getSystemConfig();
                const trialEndDate = systemConfig.trial.enabled 
                    ? addDays(new Date(), systemConfig.trial.days)
                    : new Date(); // Se teste desabilitado, expira imediatamente
                    
                // CRITICAL: Create the business document WITHOUT a name to force setup.
                const newBusinessData: Partial<ConfiguracoesNegocio> = {
                    nome: '', // Explicitly set to empty to trigger setup flow
                    email: user.email || undefined,
                    createdAt: new Date(),
                    planId: systemConfig.trial.enabled ? systemConfig.trial.planId : 'plano_gratis',
                    whatsappConectado: false,
                    access_expires_at: trialEndDate,
                };
                const businessDocRef = doc(firestore, `negocios/${user.uid}`);
                await setDocumentNonBlocking(businessDocRef, newBusinessData, { merge: true });
                toast({ title: "Conta criada com sucesso!", description: "Vamos começar com algumas configurações." });
                router.push('/configuracoes');
            } else {
                // For existing users, just go to the dashboard. The layout will handle redirects if setup is incomplete.
                router.push('/dashboard');
            }

        } catch (firebaseError: any) {
            handleFirebaseAuthError(firebaseError, setError);
        } finally {
            setIsGoogleLoading(false);
        }
    };


    const handlePasswordReset = async () => {
        if (!email) {
            setError("Por favor, digite seu e-mail para recuperar a senha.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: "E-mail de Recuperação Enviado",
                description: "Verifique sua caixa de entrada.",
            });
        } catch (firebaseError: any) {
            handleFirebaseAuthError(firebaseError, setError);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-sidebar-background">
            <Card className="w-full max-w-sm z-10 animate-fade-in-up">
                <CardHeader className="items-center text-center">
                    <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                        <Gem className="h-6 w-6"/>
                    </div>
                    <CardTitle className="text-2xl pt-4 font-headline">
                        {isLoginView ? 'Acesse sua Conta' : 'Crie sua Conta'}
                    </CardTitle>
                    <CardDescription>
                        {isLoginView ? 'Bem-vindo de volta!' : 'Comece a gerenciar seu negócio.'}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="grid gap-4">
                     <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                        {isGoogleLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <GoogleIcon className="mr-2 h-4 w-4" />
                        )}
                        Entrar com Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            Ou continue com
                            </span>
                        </div>
                    </div>
                </CardContent>

                <form onSubmit={handleSubmit}>
                    <CardContent className="grid gap-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading || isGoogleLoading}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                             <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                {isLoginView && (
                                    <Button type="button" variant="link" onClick={handlePasswordReset} className="p-0 h-auto text-xs" disabled={isLoading || isGoogleLoading}>
                                        Esqueceu a senha?
                                    </Button>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading || isGoogleLoading}
                                    required
                                />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                        </div>
                        {!isLoginView && (
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="********"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={isLoading || isGoogleLoading}
                                        required
                                    />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={isLoading || isGoogleLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? 'Carregando...' : (isLoginView ? 'Entrar' : 'Criar Conta')}
                        </Button>
                        <Button variant="link" type="button" onClick={() => setIsLoginView(!isLoginView)} disabled={isLoading || isGoogleLoading}>
                            {isLoginView ? 'Não tem uma conta? Crie agora' : 'Já tem uma conta? Faça login'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

function LoginPageWrapper() {
    const { user, isUserLoading } = useFirebase();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && user) {
            router.push('/dashboard');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="size-8 animate-spin" />
            </div>
        );
    }

    return <LoginPageContent />;
}

export default function LoginPage() {
    return (
        <FirebaseClientProvider>
            <LoginPageWrapper />
        </FirebaseClientProvider>
    )
}

    