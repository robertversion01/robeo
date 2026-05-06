'use client';

// TODO: Replace with native implementation once shadcn is installed
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

          <div className="h-px bg-border w-full my-2" />

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

          <div className="h-px bg-border w-full my-2" />

          <div className="text-center text-sm text-muted-foreground">
            Ez egy elektronikus nyugta, amely jogosítványként tekinthető.
          </div>

          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2 bg-secondary rounded-xl text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              Letöltés
            </button>
            <button className="flex-1 px-4 py-2 bg-secondary rounded-xl text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center">
              <Printer className="w-4 h-4 mr-2" />
              Nyomtatás
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}