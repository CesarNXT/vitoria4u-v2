"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { getAuth } from 'firebase/auth';
import { Upload, X, Loader2, Image, Video, Mic } from 'lucide-react';
import { CampanhaTipo } from '@/lib/types';

interface MediaUploadProps {
  tipo: CampanhaTipo;
  mediaUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
}

export function MediaUpload({ tipo, mediaUrl, onUploadComplete, onRemove }: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(mediaUrl || null);

  // Não renderizar nada se for tipo texto
  if (tipo === 'texto') {
    return null;
  }

  // Definir tipos aceitos baseado no tipo da campanha
  const getAcceptedTypes = () => {
    switch (tipo) {
      case 'imagem':
        return 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
      case 'video':
        return 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska';
      case 'audio':
        return 'audio/mpeg,audio/mp3,audio/ogg,audio/wav';
      default:
        return '';
    }
  };

  const getMaxSize = () => {
    // Limites do catbox.moe: 200MB
    return 200 * 1024 * 1024;
  };

  const getIcon = () => {
    switch (tipo) {
      case 'imagem':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (tipo) {
      case 'imagem':
        return 'Imagem';
      case 'video':
        return 'Vídeo';
      case 'audio':
        return 'Áudio';
      default:
        return 'Arquivo';
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    const maxSize = getMaxSize();
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: `O tamanho máximo é ${Math.round(maxSize / (1024 * 1024))}MB.`,
      });
      return;
    }

    // Validar tipo
    const acceptedTypes = getAcceptedTypes().split(',');
    if (!acceptedTypes.some(type => file.type.match(type.replace('*', '.*')))) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo não suportado",
        description: `Apenas ${getLabel().toLowerCase()} é permitido.`,
      });
      return;
    }

    setIsUploading(true);

    // Criar preview para imagens e vídeos
    if (tipo === 'imagem' || tipo === 'video') {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    }

    // Fazer upload via API proxy
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);
    formData.append('userhash', '');

    try {
      const user = getAuth().currentUser;
      if (!user) {
        toast({
          variant: "destructive",
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para fazer upload.",
        });
        setIsUploading(false);
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/upload-campanha', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok && responseText.startsWith('http')) {
        onUploadComplete(responseText);
        toast({
          title: `${getLabel()} carregado com sucesso!`,
        });
      } else {
        throw new Error(`Falha no upload: ${responseText}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Erro no Upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove();
  };

  return (
    <div className="space-y-2">
      <Label>{getLabel()} *</Label>

      {preview ? (
        <div className="space-y-2">
          {/* Preview da mídia */}
          {tipo === 'imagem' && (
            <div className="relative w-full h-48 border rounded-md overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {tipo === 'video' && (
            <div className="relative w-full border rounded-md overflow-hidden">
              <video
                src={preview}
                controls
                className="w-full max-h-64"
              />
            </div>
          )}

          {tipo === 'audio' && (
            <div className="relative w-full border rounded-md p-4 flex items-center gap-3 bg-muted">
              <Mic className="h-8 w-8 text-primary" />
              <audio
                src={preview}
                controls
                className="flex-1"
              />
            </div>
          )}

          {/* Botão remover */}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Remover {getLabel()}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="media-upload"
              accept={getAcceptedTypes()}
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
            />
            <label
              htmlFor="media-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                getIcon()
              )}
              <span className="text-sm text-muted-foreground">
                {isUploading
                  ? 'Fazendo upload...'
                  : `Clique para selecionar ${getLabel().toLowerCase()}`}
              </span>
              <span className="text-xs text-muted-foreground">
                Máximo: 200MB
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
