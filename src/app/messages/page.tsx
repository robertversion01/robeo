'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OffersList from '@/components/product/OffersList';
import { toast } from 'sonner';
import { isUuid } from '@/lib/validators';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  product_id: string | null;
  message_type?: 'text' | 'image' | 'system';
  media_url?: string | null;
}

interface Conversation {
  user_id: string;
  email: string;
  last_message: string;
  last_message_time: string;
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMeta, setOfferMeta] = useState<{ min: number; title: string } | null>(null);
  const [offerSending, setOfferSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedConversationRef = useRef<string | null>(null);
  const selectedEmailRef = useRef<string>('');
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`messages_last_seen_at_${user.id}`, new Date().toISOString());
    window.dispatchEvent(new CustomEvent('messages:seen'));
    loadConversations();
    subscribeToMessages();

    return () => {
      supabase.removeAllChannels();
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    selectedEmailRef.current = selectedEmail;
  }, [selectedEmail]);

  useEffect(() => {
    if (!showOfferModal || !selectedConversation || !user?.id) {
      setOfferMeta(null);
      return;
    }
    const latestProductMessage = [...messages]
      .reverse()
      .find((msg) => msg.product_id);
    if (!latestProductMessage?.product_id) {
      setOfferMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('price, name')
        .eq('id', latestProductMessage.product_id!)
        .maybeSingle();
      if (cancelled || error || !data) {
        if (!cancelled) setOfferMeta(null);
        return;
      }
      const price = Number(data.price);
      setOfferMeta({
        min: Math.ceil(price * 0.6),
        title: data.name || 'Termék',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [showOfferModal, selectedConversation, user?.id, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    setUser(user);
    setLoading(false);
  };

  const subscribeToMessages = () => {
    const channel = supabase.channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        loadConversations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'offers',
      }, async (payload: any) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser?.id) return;
        const offer = payload.new;
        if (!offer) return;
        if (offer.buyer_id === currentUser.id || offer.seller_id === currentUser.id) {
          loadConversations();
          const activeConversationId = selectedConversationRef.current;
          if (activeConversationId) {
            loadConversation(activeConversationId, selectedEmailRef.current);
          }
          if (payload.eventType === 'UPDATE' && offer.status === 'countered') {
            toast.success('Ellenajánlat érkezett, frissítve a beszélgetés.');
          }
        }
      })
      .subscribe();
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) return;

    // Group by conversation
    const convMap = new Map<string, Message>();
    (data as Message[] | null)?.forEach((msg: Message) => {
      const otherUser = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(otherUser)) {
        convMap.set(otherUser, msg);
      }
    });

    // Get user emails from auth.users
    const userIds = Array.from(convMap.keys());
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    const emailMap = new Map<string, string>();
    (userData as Array<{ id: string; email: string }> | null)?.forEach((u) =>
      emailMap.set(u.id, u.email)
    );

    const convList: Conversation[] = Array.from(convMap.entries()).map(([user_id, msg]) => ({
      user_id,
      email: emailMap.get(user_id) || 'Felhasználó',
      last_message: msg.content,
      last_message_time: msg.created_at
    }));

    setConversations(convList);
  };

  const loadConversation = async (otherUserId: string, email?: string) => {
    setSelectedConversation(otherUserId);
    setSelectedEmail(email || '');
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .is('is_system_message', false)
      .order('created_at', { ascending: true });

    if (error) return;
    setMessages((data as Message[]) || []);
  };

  const closeConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage.trim();
    setNewMessage('');
    const latestProductMessage = [...messages].reverse().find((msg) => msg.product_id);

    await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedConversation,
        content,
        product_id: latestProductMessage?.product_id || null,
        message_type: 'text'
      });
  };

  const sendImageMessage = async (file: File) => {
    if (!selectedConversation || !user) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('chat-media').getPublicUrl(filePath);
      const mediaUrl = publicData.publicUrl;

      await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedConversation,
          content: '📷 Kép',
          message_type: 'image',
          media_url: mediaUrl,
        });
    } catch (error: any) {
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#007782] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const sendOffer = async () => {
    if (!selectedConversation || !user?.id) return;
    const latestProductMessage = [...messages].reverse().find((msg) => msg.product_id);
    if (!latestProductMessage?.product_id) {
      toast.error('Ehhez a beszélgetéshez nem találtam termék-azonosítót az ajánlathoz.');
      return;
    }
    if (
      !isUuid(latestProductMessage.product_id) ||
      !isUuid(selectedConversation) ||
      !isUuid(user.id)
    ) {
      toast.error('Hibás azonosító(k), ezért az ajánlat nem küldhető el.');
      return;
    }

    const amount = parseInt(offerAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Adj meg érvényes összeget.');
      return;
    }

    const minimum = offerMeta?.min ?? 1;
    if (amount < minimum) {
      toast.error(`Minimum ajánlat: ${minimum.toLocaleString('hu-HU')} Ft (a listaár ~60%-a).`);
      return;
    }

    setOfferSending(true);
    try {
      const { error: offerErr } = await supabase.from('offers').insert({
        product_id: latestProductMessage.product_id,
        buyer_id: user.id,
        seller_id: selectedConversation,
        offered_price: amount,
        status: 'pending',
      });

      if (offerErr) {
        if (offerErr.code === '23505') {
          toast.error('Már van aktív ajánlatod ehhez a termékhez.');
        } else {
          throw offerErr;
        }
        return;
      }

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedConversation,
        content: `💡 Ajánlat: ${amount.toLocaleString('hu-HU')} Ft`,
        product_id: latestProductMessage.product_id,
        message_type: 'system',
        is_system_message: true,
      });

      toast.success('Ajánlat elküldve.');
      setShowOfferModal(false);
      setOfferAmount('');
      window.dispatchEvent(new CustomEvent('offers:updated'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ismeretlen hiba';
      toast.error('Ajánlat küldése sikertelen: ' + msg);
    } finally {
      setOfferSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Offer Modal */}
      {showOfferModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="presentation"
          onClick={() => !offerSending && setShowOfferModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-gray-200 shadow-2xl p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">Ajánlat küldése</h2>
            {offerMeta ? (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{offerMeta.title}</p>
            ) : (
              <p className="text-sm text-amber-700 mt-1">Termék betöltése…</p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              {offerMeta
                ? `Legalább ${offerMeta.min.toLocaleString('hu-HU')} Ft (listaár ~60%-a).`
                : 'A minimum az aktuális listaárhoz igazodik.'}
            </p>

            <input
              type="number"
              inputMode="numeric"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Összeg (Ft)"
              disabled={offerSending}
              min={offerMeta?.min ?? 1}
              className="mt-4 w-full input-base min-h-12 rounded-xl text-center text-lg font-semibold tabular-nums focus:ring-[#007782] focus:border-[#007782]"
            />

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                disabled={offerSending}
                onClick={() => setShowOfferModal(false)}
                className="flex-1 btn-base btn-secondary min-h-11 rounded-xl"
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={offerSending || !offerMeta}
                onClick={() => void sendOffer()}
                className="flex-1 btn-base btn-primary min-h-11 rounded-xl"
              >
                {offerSending ? 'Küldés…' : 'Küldés'}
              </button>
            </div>
          </div>
        </div>
      )}
      <main
        className={`${MAIN_TOP_PADDING} pb-24 md:pb-8 min-h-[100dvh] md:h-screen max-w-full overflow-x-hidden`}
      >
        <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row">
          
          {/* Offers Section */}
          <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold mb-4">Beérkező ajánlatok</h2>
              <OffersList />
            </div>

            <h2 className="text-xl font-bold p-5 border-b border-gray-200">Beszélgetések</h2>
            
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nincs még beszélgetésed
              </div>
            ) : (
              <div>
                {conversations.map(conv => (
                  <button
                    key={conv.user_id}
                    onClick={() => loadConversation(conv.user_id, conv.email)}
                    className={`w-full text-left p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedConversation === conv.user_id ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] font-bold">
                        {conv.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium mb-1 truncate">{conv.email}</div>
                        <div className="text-sm text-gray-500 truncate">{conv.last_message}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col min-h-[70vh] md:min-h-0 ${selectedConversation ? 'block' : 'hidden md:flex'}`}>
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Válassz ki egy beszélgetést
              </div>
            ) : (
              <>
                {/* Chat Header (mobile back button) */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-200 md:hidden">
                  <button
                    onClick={closeConversation}
                    className="icon-btn text-gray-700"
                  >
                    ←
                  </button>
                  <div className="w-8 h-8 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] font-bold text-sm">
                    {selectedEmail?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="font-medium truncate">{selectedEmail}</span>
                </div>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                  {messages.map(msg => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
                          msg.sender_id === user.id 
                            ? 'bg-[#007782] text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                        }`}
                      >
                        {msg.message_type === 'image' && msg.media_url ? (
                          <img src={msg.media_url} alt="chat-image" className="max-w-full rounded-lg" />
                        ) : (
                          msg.content
                        )}
                        <div className={`mt-1 text-[10px] ${msg.sender_id === user.id ? 'text-white/80' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-2.5 md:p-4 border-t border-gray-200 bg-white sticky bottom-0 z-20">
                  {/* Offer Button */}
                  {selectedConversation && (
                    <div className="mb-4">
                      <button
                        onClick={() => setShowOfferModal(true)}
                        className="w-full btn-base btn-ghost"
                      >
                        💰 Ajánlatot teszek
                      </button>
                    </div>
                  )}

                   <form onSubmit={sendMessage} className="flex flex-nowrap items-center gap-2 max-w-full box-border px-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) sendImageMessage(file);
                        if (e.target) e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="icon-btn shrink-0 bg-gray-100 border border-gray-300 hover:bg-gray-200 transition-all"
                    >
                      {uploadingImage ? '...' : '📷'}
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Üzenet írása..."
                      className="flex-1 min-w-0 min-h-10 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:border-[#007782] transition-all"
                    />
                    <button
                      type="submit"
                      className="icon-btn shrink-0 bg-[#007782] text-white font-medium hover:bg-[#00616b] transition-all"
                      aria-label="Üzenet küldése"
                    >
                      ➤
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}