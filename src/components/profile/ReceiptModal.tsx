'use client';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="max-w-md w-full card-base p-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="icon-btn absolute top-3 right-3 text-muted-foreground hover:text-[#e7edf0]">
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="text-2xl font-bold">🧾 Vevői Nyugta</div>
          <div className="text-muted-foreground">Sikeres vásárlás igazolása</div>
        </div>

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
            <button className="flex-1 btn-base btn-secondary inline-flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              Letöltés
            </button>
            <button className="flex-1 btn-base btn-secondary inline-flex items-center justify-center">
              <Printer className="w-4 h-4 mr-2" />
              Nyomtatás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}