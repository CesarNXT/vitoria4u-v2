

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { initializeFirebase } from "@/firebase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from '@/lib/utils'
import { verifyAdmin } from './actions'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, Gem, Eye, EyeOff } from "lucide-react"
import { FirebaseClientProvider } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { createAdminSession } from '@/app/(public)/login/session-actions'

const handleFirebaseAuthError = (firebaseError: any, setError: (message: string) => void) => {
    switch (firebaseError.code) {
        case 'auth/invalid-email':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
             setError("E-mail ou senha de administrador inválidos.");
             break;
        case 'auth/too-many-requests':
            setError("Muitas tentativas de login falharam. Por favor, tente novamente mais tarde.");
            break;
        default:
            console.error("Firebase Auth Error:", firebaseError);
            setError("Ocorreu um erro desconhecido durante a autenticação.");
            break;
    }
}

function AdminLoginContent() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const { auth } = initializeFirebase();

        try {
            const { isAdmin } = await verifyAdmin(email);
            if (!isAdmin) {
                setError("Acesso negado. Este e-mail não é de um administrador. Use /login para usuários comuns.");
                setIsLoading(false);
                return;
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();
            const sessionResult = await createAdminSession(idToken);
            
            if (!sessionResult.success) {
                throw new Error('Falha ao criar sessão admin');
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('impersonatedBusinessId');
            }

            toast({
                title: "Login Admin realizado!",
                description: "Redirecionando para o painel administrativo...",
            });
            
            window.location.href = '/admin/dashboard';
            return;
        } catch (firebaseError: any) {
            handleFirebaseAuthError(firebaseError, setError);
            setIsLoading(false);
        }
    };
    


    return (
        <div className="flex items-center justify-center min-h-screen p-4 overflow-hidden relative bg-sidebar-background">
            <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
            </div>
            
            <Card className="w-full max-w-sm z-10 animate-fade-in-up">
                <CardHeader className="items-center text-center">
                    <div className="p-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white">
                        <Gem className="h-6 w-6"/>
                    </div>
                    <CardTitle className="text-2xl pt-4 font-headline">
                        Painel Administrativo
                    </CardTitle>
                    <CardDescription>
                        Acesso exclusivo para administradores.
                    </CardDescription>
                </CardHeader>
                
                <form onSubmit={handleSubmit}>
                    <CardContent className="grid gap-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro de Acesso</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="admin@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="grid gap-2">
                                <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    autoComplete="current-password"
                                />
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardContent>
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? 'Verificando...' : 'Entrar'}
                        </Button>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
}


export default function AdminLoginPage() {
    return (
        <FirebaseClientProvider>
            <AdminLoginContent />
        </FirebaseClientProvider>
    )
}
