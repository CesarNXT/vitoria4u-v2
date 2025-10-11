'use client'

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

export function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, itemName }: DeleteConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const confirmationKeyword = 'sim';

  const isConfirmationValid = confirmationText.toLowerCase() === confirmationKeyword;

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Você tem certeza que deseja excluir permanentemente o negócio <strong>{itemName}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label htmlFor="confirmation">Para confirmar, digite <strong>{confirmationKeyword}</strong> no campo abaixo.</Label>
          <Input 
            id="confirmation" 
            value={confirmationText} 
            onChange={(e) => setConfirmationText(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!isConfirmationValid}
          >
            Excluir Permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
