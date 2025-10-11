'use client'

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FirebaseClientProvider, useFirebase } from "@/firebase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react"
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { auth } = useFirebase();

    const [oobCode, setOobCode] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isValidCode, setIsValidCode] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const whatsappNumber = "81979123125";

    useEffect(() => {
        const code = searchParams.get('oobCode');
        if (!code) {
            setError("Link de redefinição inválido ou expirado.");
            setIsLoading(false);
            return;
        }

        setOobCode(code);
        verifyPasswordResetCode(auth, code)
            .then(() => {
                setIsValidCode(true);
            })
            .catch((error) => {
                console.error("Invalid password reset code:", error);
                setError("O link para redefinir a senha é inválido ou já expirou. Por favor, solicite um novo link.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [auth, searchParams]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        
        if (newPassword !== confirmNewPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        if (newPassword.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.");
            return;
        }
        if (!oobCode) {
            setError("Código de redefinição não encontrado.");
            return;
        }

        setIsLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);
            toast({
                title: "Senha Redefinida!",
                description: "Sua senha foi alterada com sucesso.",
            });
        } catch (firebaseError: any) {
            console.error("Password reset error:", firebaseError);
            setError("Ocorreu um erro ao redefinir sua senha. O link pode ter expirado. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderContent = () => {
        if (isLoading) {
             return <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
        }
        if (error) {
            return (
                 <div className="flex flex-col items-center text-center gap-4">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <Alert variant="destructive">
                        <AlertTitle>Link Inválido</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button asChild variant="link">
                        <Link href="/login">Voltar para o Login</Link>
                    </Button>
                </div>
            );
        }
        if (success) {
            return (
                <div className="flex flex-col items-center text-center gap-4 p-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <h2 className="text-xl font-semibold">Senha Alterada!</h2>
                    <p className="text-muted-foreground">Sua senha foi redefinida com sucesso. Agora você pode fazer login com sua nova senha.</p>
                    <Button asChild className="w-full" variant="gradient">
                        <Link href="/login">Ir para o Login</Link>
                    </Button>
                </div>
            );
        }
        if (isValidCode) {
            return (
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2 text-left">
                        <Label htmlFor="password">Nova senha</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Digite sua nova senha"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full py-3 px-4 border-[1.5px] border-gray-300 rounded-xl focus:border-purple-400 focus:ring-purple-500/20 focus:ring-4"
                                required
                            />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff /> : <Eye />}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label htmlFor="confirmPassword">Confirmar senha</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirme sua nova senha"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="w-full py-3 px-4 border-[1.5px] border-gray-300 rounded-xl focus:border-purple-400 focus:ring-purple-500/20 focus:ring-4"
                                required
                            />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <EyeOff /> : <Eye />}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="text-left">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full !mt-6 rounded-full" size="lg" disabled={isLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Salvar nova senha
                    </Button>
                </form>
            );
        }
        return null;
    }

    return (
       <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-700">
            <div className="bg-white rounded-2xl p-8 sm:p-10 text-center shadow-2xl w-full max-w-md animate-fade-in-up">
                <Image src="https://files.catbox.moe/mrvozv.gif" alt="Vitória4u Logo" width={80} height={80} className="rounded-full mx-auto mb-5" />
                <h1 className="text-2xl font-bold text-purple-700">Redefinir senha</h1>
                <p className="text-gray-600 mt-2 mb-6">Crie uma nova senha para acessar sua conta com segurança 💜</p>
                {renderContent()}
                <div className="mt-6 text-center text-sm text-gray-600">
                    Precisa de ajuda?{' '}
                    <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-700 underline hover:text-purple-800">
                        Falar com suporte
                    </a>
                </div>
            </div>
        </div>
    );
}

function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}

export default function ResetPasswordPageWrapper() {
    return (
        <FirebaseClientProvider>
            <ResetPasswordPage />
        </FirebaseClientProvider>
    )
}
