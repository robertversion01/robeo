'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OffersList from '@/components/product/OffersList';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  product_id: string | null;
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
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    subscribeToMessages();

    return () => {
      supabase.removeAllChannels();
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedConversation,
        content
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const sendOffer = async () => {
    if (!offerAmount || !selectedConversation) return;

    // TODO: The product_id needs to be passed from the conversation context
    // For now, we create the offer without a product reference
    await supabase
      .from('offers')
      .insert({
        product_id: null,  // Will be set when product context is available
        buyer_id: user.id,
        seller_id: selectedConversation,
        offered_price: parseInt(offerAmount),
        status: 'pending'
      });

    await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedConversation,
        content: `💡 AJÁNLAT: ${parseInt(offerAmount).toLocaleString()} Ft`,
        product_id: null
      });

    setShowOfferModal(false);
    setOfferAmount('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">💰 Ajánlat teszek</h2>
            <p className="text-white/60 mb-6">Add meg az ajánlott összeget a termékért!</p>
            
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Összeg Ft-ban"
              className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-xl text-center mb-6"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-3 border border-white/30 rounded-xl hover:bg-white/10 transition-all"
              >
                Mégse
              </button>
              <button
                onClick={sendOffer}
                className="flex-1 py-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all"
              >
                Ajánlat elküldése
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="pt-20 pb-8 h-screen max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row">
          
          {/* Offers Section */}
          <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-5 border-b border-white/10">
              <h2 className="text-xl font-bold mb-4">Beérkező ajánlatok</h2>
              <OffersList />
            </div>

            <h2 className="text-xl font-bold p-5 border-b border-white/10">Beszélgetések</h2>
            
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                Nincs még beszélgetésed
              </div>
            ) : (
              <div>
                {conversations.map(conv => (
                  <button
                    key={conv.user_id}
                    onClick={() => loadConversation(conv.user_id, conv.email)}
                    className={`w-full text-left p-5 border-b border-white/5 hover:bg-white/5 transition-colors ${
                      selectedConversation === conv.user_id ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                        {conv.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium mb-1 truncate">{conv.email}</div>
                        <div className="text-sm text-white/60 truncate">{conv.last_message}</div>
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
              <div className="flex-1 flex items-center justify-center text-white/50">
                Válassz ki egy beszélgetést
              </div>
            ) : (
              <>
                {/* Chat Header (mobile back button) */}
                <div className="flex items-center gap-3 p-4 border-b border-white/10 md:hidden">
                  <button
                    onClick={closeConversation}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    ←
                  </button>
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                    {selectedEmail?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="font-medium truncate">{selectedEmail}</span>
                </div>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map(msg => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-xs md:max-w-md px-5 py-3 rounded-2xl ${
                          msg.sender_id === user.id 
                            ? 'bg-accent text-black rounded-br-none' 
                            : 'bg-white/10 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-white/10">
                  {/* Offer Button */}
                  {selectedConversation && (
                    <div className="mb-4">
                      <button
                        onClick={() => setShowOfferModal(true)}
                        className="w-full py-3 border-2 border-accent text-accent font-medium rounded-xl hover:bg-accent hover:text-black transition-all"
                      >
                        💰 Ajánlatot teszek
                      </button>
                    </div>
                  )}

                   <form onSubmit={sendMessage} className="flex gap-3 max-w-full box-border px-0">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Üzenet írása..."
                      className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-full focus:outline-none focus:border-accent transition-all"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-accent text-black font-medium rounded-full hover:bg-accent/90 transition-all"
                    >
                      Küldés
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