'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatPrice, formatDate } from '@/lib/utils';
import { Printer, Download, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: {
    id: string;
    productName: string;
    price: number;
    sellerEmail: string;
    buyerEmail: string;
    purchaseDate: string;
    transactionId: string;
  };
}

export default function ReceiptModal({ isOpen, onClose, receipt }: ReceiptModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">🧾 Vevői Nyugta</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Sikeres vásárlás igazolása
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-accent/10 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-accent">{formatPrice(receipt.price)}</div>
            <div className="text-sm text-muted-foreground">Tranzakció azonosító: {receipt.transactionId}</div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Termék neve:</span>
              <span className="font-medium">{receipt.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Eladó:</span>
              <span>{receipt.sellerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vevő:</span>
              <span>{receipt.buyerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vásárlás időpontja:</span>
              <span>{formatDate(receipt.purchaseDate)}</span>
            </div>
          </div>

          <Separator />

          <div className="text-center text-sm text-muted-foreground">
            Ez egy elektronikus nyugta, amely jogosítványként tekinthető.
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Letöltés
            </Button>
            <Button variant="secondary" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Nyomtatás
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}