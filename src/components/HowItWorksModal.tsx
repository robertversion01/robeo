'use client';

import { X, Search, MessageCircle, Handshake, ShieldCheck } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <Search size={24} />,
      title: 'Böngéssz',
      description: 'Nézz körül több száz stílusos termék között, amiket ténylegesen más emberek adnak el.'
    },
    {
      icon: <Handshake size={24} />,
      title: 'Alkudj',
      description: 'Ne aggódj a ár miatt! Küldj ajánlatot, és egyeztess a vásárlóval vagy eladóval.'
    },
    {
      icon: <MessageCircle size={24} />,
      title: 'Beszélj',
      description: 'Kérdezz bátran a termékről, egyeztess a kiszállításról a közvetlen üzenetben.'
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Vásárolj biztonságosan',
      description: 'Minden felhasználó értékelésre kerül, csak megbízható emberekkel találkozol.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl p-6 rounded-2xl bg-[rgba(30,27,75,0.95)] backdrop-blur-xl border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold">🤔 Hogyan működik a ROBEO?</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 rounded-xl bg-accent/20 text-accent">
                  {step.icon}
                </div>
                <div className="font-semibold text-lg">{step.title}</div>
              </div>
              <p className="text-white/70">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-5 rounded-xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20">
          <p className="text-center text-white/80">
            Ez egy <span className="font-semibold text-accent">100% magyar, közösség alapú</span> platform. 
            Nincs közvetítő díj, nincs rejtett költség. Csak ti és a stílus.
          </p>
        </div>
      </div>
    </div>
  );
}