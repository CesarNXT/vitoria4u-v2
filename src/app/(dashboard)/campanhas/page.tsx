

"use client"

import { useState, useEffect, useCallback } from 'react';
import { getClientsOnSnapshot, getBusinessConfig } from '@/lib/firestore';
import { useFirebase } from '@/firebase';
import type { Cliente, User, ConfiguracoesNegocio, Plano } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlayCircle, Upload, Image as ImageIcon, Video, AlertTriangle, Info, WifiOff, MessageSquare, Mic, Gem } from 'lucide-react';
import { sendCampaignWebhook } from './actions';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { isFuture } from 'date-fns';
import { convertTimestamps } from '@/lib/utils';


type CampaignStatus = 'inactive' | 'running';
type CampaignType = 'text' | 'image' | 'video' | 'audio';

interface CampaignState {
  status: CampaignStatus;
  startTime: number | null;
  totalTime: number;
  message: string;
  mediaUrl: string;
  campaignType: CampaignType;
}

const SECONDS_PER_CLIENT = 80;

export default function CampanhasPage({ businessUserId }: { businessUserId?: string }) {
  const { toast } = useToast();
  
  const { user, firestore } = useFirebase();
  const [clients, setClients] = useState<Cliente[]>([]);
  const [businessSettings, setBusinessSettings] = useState<ConfiguracoesNegocio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmingStart, setIsConfirmingStart] = useState(false);

  const [campaignType, setCampaignType] = useState<CampaignType>('text');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState('');

  const [campaignState, setCampaignState] = useState<CampaignState>({
    status: 'inactive',
    startTime: null,
    totalTime: 0,
    message: '',
    mediaUrl: '',
    campaignType: 'text',
  });
  const [progress, setProgress] = useState(0);
  
  const finalUserId = businessUserId || user?.uid;

  useEffect(() => {
    if (!finalUserId || !firestore) return;
    setIsLoading(true);

    const clientsSub = getClientsOnSnapshot(finalUserId, (data) => {
        setClients(data.filter(c => c.status === 'Ativo'));
    });

    const settingsDocRef = doc(firestore, `negocios/${finalUserId}`);
    const settingsSub = onSnapshot(settingsDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setBusinessSettings({ 
              id: doc.id, 
              ...data,
              access_expires_at: data.access_expires_at?.toDate ? data.access_expires_at.toDate() : new Date(data.access_expires_at),
             } as ConfiguracoesNegocio);
        }
        setIsLoading(false);
    });
    
    // Load campaign state from localStorage after user is identified
    const savedState = localStorage.getItem(`campaignState_${finalUserId}`);
    if (savedState) {
        const parsedState: CampaignState = JSON.parse(savedState);
        if (parsedState.status === 'running') {
            setCampaignState(parsedState);
            setCampaignType(parsedState.campaignType || 'text');
            setMessage(parsedState.message);
            setMediaUrl(parsedState.mediaUrl);
            setMediaPreview(parsedState.mediaUrl);
        } else {
            localStorage.removeItem(`campaignState_${finalUserId}`);
        }
    }
    
    return () => {
        clientsSub();
        settingsSub();
    };

  }, [finalUserId, firestore]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (campaignState.status === 'running' && campaignState.startTime && campaignState.totalTime > 0) {
      interval = setInterval(() => {
        const elapsedTime = (Date.now() - campaignState.startTime!) / 1000;
        const newProgress = Math.min((elapsedTime / campaignState.totalTime) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setCampaignState(prev => ({ ...prev, status: 'inactive', startTime: null }));
           if(finalUserId) localStorage.removeItem(`campaignState_${finalUserId}`);
          toast({ title: "Campanha Concluída!", description: "Sua campanha foi enviada para todos os clientes ativos." });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [campaignState, finalUserId, toast]);

  useEffect(() => {
    if (finalUserId && campaignState.status === 'running') {
        localStorage.setItem(`campaignState_${finalUserId}`, JSON.stringify(campaignState));
    }
  }, [campaignState, finalUserId]);
  
  // A verificação de acesso agora é feita no backend (action). 
  // Esta constante é para manter a lógica de exibição, mas poderia ser removida no futuro.
  const hasAccessToCampaigns = true;

  const activeClientsCount = clients.length;
  const estimatedTotalTime = activeClientsCount * SECONDS_PER_CLIENT;

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}min `;
    if (seconds > 0 && hours === 0) result += `${seconds}s`;
    
    return result.trim() || '0s';
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) { // 200MB limit for catbox
        toast({
            variant: "destructive",
            title: "Arquivo muito grande",
            description: "O tamanho máximo do arquivo é 200MB.",
        });
        return;
    }

    setIsUploading(true);
    setMediaPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);
    formData.append('userhash', '');

    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok && responseText.startsWith('http')) {
        setMediaUrl(responseText);
        toast({ title: "Mídia carregada com sucesso!" });
      } else {
        throw new Error(`Falha no upload: ${responseText}`);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({ variant: "destructive", title: "Erro no Upload", description: errorMessage });
      setMediaPreview('');
      setMediaUrl('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartConfirmation = () => {
     if (!businessSettings?.whatsappConectado) {
      toast({ variant: "destructive", title: "WhatsApp Desconectado", description: "Conecte seu WhatsApp na página de Dashboard para iniciar uma campanha." });
      return;
    }
    
    const isTextMessage = campaignType === 'text' && message;
    const isMediaMessage = campaignType !== 'text' && mediaUrl;

    if (!isTextMessage && !isMediaMessage) {
      toast({ variant: "destructive", title: "Campanha Vazia", description: "Escreva uma mensagem ou envie uma mídia para iniciar." });
      return;
    }
    
     if (activeClientsCount === 0) {
      toast({ variant: "destructive", title: "Nenhum Cliente", description: "Você não tem clientes ativos para enviar a campanha." });
      return;
    }

    setIsConfirmingStart(true);
  }

  const handleStartCampaign = async () => {
    if (!businessSettings) return;

    setIsConfirmingStart(false);

    const campaignMessage = campaignType === 'text' ? message : '';
    const campaignMediaUrl = campaignType !== 'text' ? mediaUrl : '';
    
    let typeMidea: 'image' | 'video' | 'ptt' | undefined = undefined;
    if (campaignType === 'image') typeMidea = 'image';
    if (campaignType === 'video') typeMidea = 'video';
    if (campaignType === 'audio') typeMidea = 'ptt';

    const newState: CampaignState = {
      status: 'running',
      startTime: Date.now(),
      totalTime: estimatedTotalTime,
      message: campaignMessage,
      mediaUrl: campaignMediaUrl,
      campaignType: campaignType,
    };
    setCampaignState(newState);

    try {
      const serializableSettings = JSON.parse(JSON.stringify(convertTimestamps(businessSettings)));

      await sendCampaignWebhook({
        eventType: 'start_campaign',
        businessSettings: serializableSettings,
        message: campaignMessage,
        mediaUrl: campaignMediaUrl,
        typeMidea: typeMidea,
      });
      toast({ title: "Campanha Iniciada!", description: `O envio para ${activeClientsCount} clientes começou.` });
    } catch (error) {
       console.error(error);
       toast({ variant: "destructive", title: "Erro ao Iniciar", description: "Não foi possível comunicar com o serviço de envio." });
       setCampaignState(prev => ({...prev, status: 'inactive', startTime: null}));
    }
  };


  if (isLoading || !businessSettings) {
    return (
        <div className="flex items-center justify-center h-full p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  const isCampaignInProgress = campaignState.status === 'running';
  const isWhatsappDisconnected = !businessSettings.whatsappConectado;

  if (!hasAccessToCampaigns) {
    return (
         <div className="flex flex-col items-center justify-center text-center h-[calc(100vh-10rem)] p-4 md:p-8">
            <div className="p-4 bg-amber-500/20 rounded-full mb-4">
                <Gem className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold">Funcionalidade Exclusiva</h2>
            <p className="max-w-md mt-2 text-muted-foreground">
                O disparo de campanhas em massa é um recurso dos planos Profissional e Premium. Faça um upgrade para alcançar todos os seus clientes de uma só vez!
            </p>
            <Button asChild className="mt-6">
                <Link href="/planos">Ver Planos de Assinatura</Link>
            </Button>
        </div>
    )
  }

  const renderCampaignContentInput = () => {
    switch(campaignType) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem da Campanha</Label>
            <Textarea
              id="message"
              placeholder="Ex: Olá! Temos uma promoção especial para você esta semana..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
              disabled={isCampaignInProgress || isWhatsappDisconnected}
            />
          </div>
        );
      case 'image':
      case 'video':
      case 'audio':
        const fileType = { image: "image/*", video: "video/mp4", audio: "audio/*" }[campaignType];
        const previewType = { image: 'image', video: 'video', audio: 'audio'}[campaignType];
        
        return (
          <div className="space-y-2">
            <Label htmlFor="media-upload">Mídia ({campaignType === 'audio' ? 'Áudio (ptt)' : campaignType})</Label>
            <div className="flex items-center gap-4">
                <Input 
                    id="media-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={handleMediaUpload} 
                    accept={fileType}
                    disabled={isUploading || isCampaignInProgress || isWhatsappDisconnected}
                />
                <Button asChild variant="outline" disabled={isUploading || isCampaignInProgress || isWhatsappDisconnected}>
                   <label htmlFor="media-upload" className="cursor-pointer">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'Enviando...' : 'Escolher Mídia'}
                   </label>
                </Button>
            </div>
             {mediaPreview && (
                <div className="mt-4 p-2 border rounded-md max-w-sm">
                   {previewType === 'image' && <Image src={mediaPreview} alt="Preview" width={200} height={200} className="rounded-md object-cover"/>}
                   {previewType === 'video' && <video src={mediaPreview} controls className="rounded-md w-full" />}
                   {previewType === 'audio' && <audio src={mediaPreview} controls className="rounded-md w-full" />}
                </div>
            )}
          </div>
        );
      default:
        return null;
    }
  }


  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campanhas de Marketing</h1>
        <p className="text-muted-foreground">Envie transmissões em massa para seus clientes ativos.</p>
      </div>

       <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Como Funciona?</AlertTitle>
          <AlertDescription>
           As campanhas são enviadas para todos os seus <strong>{activeClientsCount} clientes ativos</strong>. Para evitar bloqueios, o sistema leva cerca de {SECONDS_PER_CLIENT} segundos por cliente. O tempo total estimado para sua campanha é de <strong>{formatTime(estimatedTotalTime)}</strong>.
          </AlertDescription>
        </Alert>

        {isWhatsappDisconnected && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>WhatsApp Desconectado</AlertTitle>
            <AlertDescription>
              Para iniciar ou gerenciar campanhas, você precisa conectar seu WhatsApp na página de <Link href="/dashboard" className="font-semibold underline">Dashboard</Link>.
            </AlertDescription>
          </Alert>
        )}

      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Campanha</CardTitle>
          <CardDescription>
            Escolha o tipo de conteúdo e crie sua mensagem. A campanha será enviada para todos os clientes com status "Ativo".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <RadioGroup 
                value={campaignType} 
                onValueChange={(value: CampaignType) => {
                    if (isCampaignInProgress) return;
                    setCampaignType(value);
                    setMessage('');
                    setMediaUrl('');
                    setMediaPreview('');
                }}
                className="flex flex-wrap gap-4"
                disabled={isCampaignInProgress}
            >
                <Label htmlFor="type-text" className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all">
                    <RadioGroupItem value="text" id="type-text" />
                    <MessageSquare className="h-5 w-5 mr-1" /> Texto
                </Label>
                 <Label htmlFor="type-image" className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all">
                    <RadioGroupItem value="image" id="type-image" />
                    <ImageIcon className="h-5 w-5 mr-1" /> Imagem
                </Label>
                 <Label htmlFor="type-video" className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all">
                    <RadioGroupItem value="video" id="type-video" />
                    <Video className="h-5 w-5 mr-1" /> Vídeo
                </Label>
                 <Label htmlFor="type-audio" className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all">
                    <RadioGroupItem value="audio" id="type-audio" />
                    <Mic className="h-5 w-5 mr-1" /> Áudio (ptt)
                </Label>
            </RadioGroup>
           
           {renderCampaignContentInput()}

        </CardContent>
      </Card>
      
      {isCampaignInProgress ? (
         <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle>Campanha em Andamento...</CardTitle>
              <CardDescription>
                Sua mensagem está sendo enviada. Tempo estimado restante: {formatTime(campaignState.totalTime * (1 - progress / 100))}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Progress value={progress} />
            </CardContent>
         </Card>
      ) : (
         <div className="flex justify-end">
            <Button variant="gradient" size="lg" onClick={handleStartConfirmation} disabled={activeClientsCount === 0 || isWhatsappDisconnected}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Iniciar Campanha para {activeClientsCount} clientes
            </Button>
        </div>
      )}

      <AlertDialog open={isConfirmingStart} onOpenChange={setIsConfirmingStart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação enviará a campanha para <strong>{activeClientsCount} clientes ativos</strong>.
              Depois de iniciada, a campanha <strong>não poderá ser pausada ou cancelada</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartCampaign} className="bg-destructive hover:bg-destructive/90">
              Sim, Iniciar Campanha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
