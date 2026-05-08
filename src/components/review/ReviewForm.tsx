'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import StarRating from './StarRating';

interface ReviewFormProps {
  reviewedId: string;
  offerId?: string;
  transactionId?: string;
  onComplete?: () => void;
}

export default function ReviewForm({ reviewedId, offerId, transactionId, onComplete }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Kérlek válassz értékelést!');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Jelentkezz be az értékeléshez!');
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          reviewed_id: reviewedId,
          offer_id: offerId || null,
          transaction_id: transactionId || null,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast.success('✅ Értékelés sikeresen elküldve!');
      setRating(0);
      setComment('');
      onComplete?.();
    } catch (error: any) {
      toast.error('Hiba az értékelés küldésekor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-lg">Írj értékelést</h3>
      
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/70">Értékelés:</span>
        <StarRating rating={rating} size={28} interactive onRate={setRating} />
      </div>

      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Oszd meg a tapasztalataidat (opcionális)..."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none text-sm"
        />
        <div className="text-right text-[10px] text-white/30 mt-1">{comment.length}/500</div>
      </div>

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full py-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Küldés...' : 'Értékelés elküldése'}
      </button>
    </form>
  );
}