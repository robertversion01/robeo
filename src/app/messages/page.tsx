'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import OffersList from '@/components/product/OffersList';
import ChatProductSummary from '@/components/messages/ChatProductSummary';
import ChatTransactionPanel from '@/components/messages/ChatTransactionPanel';
import ChatBuyerOffersPanel from '@/components/messages/ChatBuyerOffersPanel';
import ChatSystemMessageBubble from '@/components/messages/ChatSystemMessageBubble';
import {
  buildConversationsFromMessages,
  type MessageRow,
} from '@/lib/conversationList';
import { fetchMyBlockedUserIds, checkBlockBetween } from '@/lib/userBlocks';
import BlockUserButton from '@/components/trust/BlockUserButton';
import { toast } from 'sonner';
import { isUuid } from '@/lib/validators';
import { isListedProduct } from '@/lib/listedProducts';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/ui/EmptyState';
import PaymentPresetChips from '@/components/messages/PaymentPresetChips';
import AppNotificationsFeed from '@/components/notifications/AppNotificationsFeed';
import { FeedNavBadge, MessagesNavBadge } from '@/context/NotificationContext';

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
  display_name: string;
  last_message: string;
  last_message_time: string;
  product_id?: string | null;
}

export default function MessagesPage() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('');
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
  const timeLocale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const [offersOpen, setOffersOpen] = useState(true);
  const [inboxTab, setInboxTab] = useState<'messages' | 'notifications'>('messages');
  const [threadBlocked, setThreadBlocked] = useState(false);
  const [productSellerId, setProductSellerId] = useState<string | null>(null);
  const [activeProductStatus, setActiveProductStatus] = useState<string | null>(null);
  const threadBlockedRef = useRef(false);

  const activeProductId =
    [...messages].reverse().find((msg) => msg.product_id)?.product_id ?? null;

  const canMakeOffer = Boolean(
    activeProductId &&
      productSellerId &&
      user?.id &&
      user.id !== productSellerId &&
      isListedProduct(activeProductStatus) &&
      !threadBlocked,
  );

  useEffect(() => {
    threadBlockedRef.current = threadBlocked;
  }, [threadBlocked]);

  useEffect(() => {
    if (!activeProductId) {
      setProductSellerId(null);
      setActiveProductStatus(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from('products')
      .select('user_id, status')
      .eq('id', activeProductId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setProductSellerId(data?.user_id ?? null);
          setActiveProductStatus(data?.status ?? null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeProductId]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id || loading) return;
    const withId = new URLSearchParams(window.location.search).get('with');
    if (!withId || selectedConversation === withId) return;
    void loadConversation(withId);
  }, [user?.id, loading, selectedConversation]);

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
        title: data.name || t('messages.defaultProduct'),
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
        const activeId = selectedConversationRef.current;
        if (!activeId || !user?.id) {
          loadConversations();
          return;
        }
        const inThread =
          (newMsg.sender_id === user.id && newMsg.receiver_id === activeId) ||
          (newMsg.sender_id === activeId && newMsg.receiver_id === user.id);
        if (inThread) {
          if (newMsg.sender_id === activeId && threadBlockedRef.current) {
            loadConversations();
            return;
          }
          setMessages((prev) => [...prev, newMsg]);
        }
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
            toast.success(t('messages.counterOffer'));
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
      .select('id, email, name, full_name')
      .in('id', userIds);

    const emailMap = new Map<string, string>();
    const displayMap = new Map<string, string>();
    (
      userData as Array<{ id: string; email: string; name?: string | null; full_name?: string | null }> | null
    )?.forEach((u) => {
      emailMap.set(u.id, u.email);
      const label = u.name?.trim() || u.full_name?.trim() || u.email?.split('@')[0] || t('messages.defaultUser');
      displayMap.set(u.id, label);
    });

    const blockedIds = await fetchMyBlockedUserIds(supabase, user.id);
    const { data: blockedByRows } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', user.id);
    const hiddenIds = new Set([
      ...blockedIds,
      ...((blockedByRows || []) as Array<{ blocker_id: string }>).map((r) => r.blocker_id),
    ]);

    const convList = buildConversationsFromMessages(
      (data as MessageRow[]) || [],
      user.id,
      emailMap,
      t('messages.defaultUser'),
      displayMap,
    )
      .filter((c) => !hiddenIds.has(c.user_id)) as Conversation[];

    setConversations(convList);
  };

  const loadConversation = async (otherUserId: string, email?: string, displayName?: string) => {
    setSelectedConversation(otherUserId);
    setSelectedEmail(email || '');
    setSelectedDisplayName(displayName || email?.split('@')[0] || '');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/messages?with=${otherUserId}`);
      window.dispatchEvent(new CustomEvent('messages:thread-changed'));
    }
    const blockCheck = await checkBlockBetween(supabase, user.id, otherUserId);
    setThreadBlocked(blockCheck.eitherBlocked);
    if (blockCheck.eitherBlocked) {
      toast.error(t('block.cannotMessage'));
    }
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) return;
    setMessages((data as Message[]) || []);
  };

  const closeConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
    setThreadBlocked(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/messages');
      window.dispatchEvent(new CustomEvent('messages:thread-changed'));
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || threadBlocked) return;

    const blockCheck = await checkBlockBetween(supabase, user.id, selectedConversation);
    if (blockCheck.eitherBlocked) {
      setThreadBlocked(true);
      toast.error(t('block.cannotMessage'));
      return;
    }

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
    if (!selectedConversation || !user || threadBlocked) return;
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
          content: t('messages.imagePreview'),
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
    if (!selectedConversation || !user?.id || threadBlocked) return;
    const latestProductMessage = [...messages].reverse().find((msg) => msg.product_id);
    if (!latestProductMessage?.product_id) {
      toast.error(t('messages.offerNoProduct'));
      return;
    }
    if (!productSellerId) {
      toast.error(t('messages.offerNoProduct'));
      return;
    }
    if (user.id === productSellerId) {
      toast.error(t('messages.offerOwnProduct'));
      return;
    }
    if (!isListedProduct(activeProductStatus)) {
      toast.error(t('messages.offerProductUnavailable'));
      return;
    }
    if (
      !isUuid(latestProductMessage.product_id) ||
      !isUuid(selectedConversation) ||
      !isUuid(user.id)
    ) {
      toast.error(t('messages.offerBadIds'));
      return;
    }

    const amount = parseInt(offerAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('messages.offerInvalidAmount'));
      return;
    }

    const minimum = offerMeta?.min ?? 1;
    if (amount < minimum) {
      toast.error(t('messages.offerMinError', { min: minimum.toLocaleString(i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU') }));
      return;
    }

    setOfferSending(true);
    try {
      const { error: offerErr } = await supabase.from('offers').insert({
        product_id: latestProductMessage.product_id,
        buyer_id: user.id,
        seller_id: productSellerId,
        offered_price: amount,
        status: 'pending',
      });

      if (offerErr) {
        if (offerErr.code === '23505') {
          toast.error(t('messages.offerDuplicate'));
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

      toast.success(t('messages.offerSent'));
      setShowOfferModal(false);
      setOfferAmount('');
      window.dispatchEvent(new CustomEvent('offers:updated'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      toast.error(t('messages.offerFailed', { msg }));
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
            <h2 className="text-lg font-bold text-gray-900">{t('messages.offerModalTitle')}</h2>
            {offerMeta ? (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{offerMeta.title}</p>
            ) : (
              <p className="text-sm text-amber-700 mt-1">{t('messages.loadingProduct')}</p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              {offerMeta
                ? t('messages.offerMinHint', {
                    min: offerMeta.min.toLocaleString(i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU'),
                  })
                : t('messages.offerMinDefault')}
            </p>

            <input
              type="number"
              inputMode="numeric"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder={t('messages.amountPlaceholder')}
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
                {t('messages.cancel')}
              </button>
              <button
                type="button"
                disabled={offerSending || !offerMeta}
                onClick={() => void sendOffer()}
                className="flex-1 btn-base btn-primary min-h-11 rounded-xl"
              >
                {offerSending ? t('messages.sending') : t('messages.send')}
              </button>
            </div>
          </div>
        </div>
      )}
      <main
        className={`${MAIN_TOP_PADDING} pb-0 md:pb-8 min-h-[100dvh] md:h-screen max-w-full overflow-x-hidden`}
      >
        {/* Mobil inbox fejléc — Üzenetek / Értesítések fülek (csak lista nézetben) */}
        {!selectedConversation ? (
          <div className="md:hidden px-4 pt-1">
            <h1 className="mb-2 text-lg font-bold text-gray-900">{t('messages.inboxTitle')}</h1>
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setInboxTab('messages')}
                className={`relative flex-1 pb-2 text-center text-sm font-semibold transition-colors ${
                  inboxTab === 'messages'
                    ? 'border-b-2 border-[#007782] text-[#007782]'
                    : 'text-gray-500'
                }`}
              >
                <span className="relative inline-block">
                  {t('messages.tabMessages')}
                  <MessagesNavBadge className="-right-3 top-0" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('notifications')}
                className={`relative flex-1 pb-2 text-center text-sm font-semibold transition-colors ${
                  inboxTab === 'notifications'
                    ? 'border-b-2 border-[#007782] text-[#007782]'
                    : 'text-gray-500'
                }`}
              >
                <span className="relative inline-block">
                  {t('messages.tabNotifications')}
                  <FeedNavBadge className="-right-3 top-0" />
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Értesítések fül tartalma (mobil) */}
        {!selectedConversation && inboxTab === 'notifications' ? (
          <div className="md:hidden pt-2">
            <AppNotificationsFeed embedded />
          </div>
        ) : null}

        <div
          className={`max-w-6xl mx-auto h-full flex flex-col md:flex-row ${
            !selectedConversation && inboxTab === 'notifications' ? 'hidden md:flex' : ''
          }`}
        >
          
          {/* Offers Section */}
          <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto flex flex-col min-h-0 ${selectedConversation ? 'hidden md:flex' : ''}`}>
            <div className="border-b border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setOffersOpen((o) => !o)}
                className="md:hidden w-full flex items-center justify-between px-4 py-3 text-left font-bold text-gray-900 touch-manipulation"
                aria-expanded={offersOpen}
              >
                {t('messages.offersCollapsible')}
                <ChevronDown
                  size={20}
                  className={`transition-transform ${offersOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div className={`${offersOpen ? 'block' : 'hidden'} md:block p-4 md:p-5`}>
                <h2 className="hidden md:block text-xl font-bold mb-4">{t('messages.offersTitle')}</h2>
                <OffersList />
              </div>
            </div>

            <h2 className="text-lg font-bold px-4 py-3 border-b border-gray-200 shrink-0">{t('messages.conversationsTitle')}</h2>
            
            {conversations.length === 0 ? (
              <EmptyState
                icon="messages"
                title={t('messages.emptyConversationsTitle')}
                description={t('messages.emptyConversationsDesc')}
                actionLabel={t('messages.emptyBrowseCta')}
                actionHref="/browse"
              />
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
                {conversations.map((conv) => (
                  <button
                    key={conv.user_id}
                    type="button"
                    onClick={() => loadConversation(conv.user_id, conv.email, conv.display_name)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors touch-manipulation ${
                      selectedConversation === conv.user_id ? 'bg-[#007782]/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] font-bold shrink-0">
                        {conv.display_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium mb-0.5 truncate text-sm">{conv.display_name}</div>
                        <div className="text-xs text-gray-500 truncate">{conv.last_message}</div>
                      </div>
                      {conv.product_id ? (
                        <Link
                          href={`/products/${conv.product_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-[10px] font-semibold text-[#007782] hover:underline"
                        >
                          →
                        </Link>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col min-h-0 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
            {!selectedConversation ? (
              <EmptyState
                icon="messages"
                title={t('messages.selectConversationTitle')}
                description={t('messages.selectConversationDesc')}
                actionLabel={t('messages.emptyBrowseCta')}
                actionHref="/browse"
              />
            ) : (
              <>
                {/* Chat Header (mobile back button) */}
                <div className="hidden md:flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] font-bold text-sm">
                    {selectedDisplayName?.charAt(0).toUpperCase() || selectedEmail?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="font-semibold truncate flex-1">{selectedDisplayName || selectedEmail}</span>
                  {selectedConversation ? (
                    <BlockUserButton
                      otherUserId={selectedConversation}
                      onBlocked={() => {
                        setThreadBlocked(true);
                        void loadConversations();
                      }}
                    />
                  ) : null}
                </div>
                <div className="flex items-center gap-3 p-3 border-b border-gray-200 md:hidden shrink-0">
                  <button
                    type="button"
                    onClick={closeConversation}
                    className="icon-btn text-gray-700"
                    aria-label={t('messages.back')}
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] font-bold text-sm">
                    {selectedDisplayName?.charAt(0).toUpperCase() || selectedEmail?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="font-medium truncate flex-1">{selectedDisplayName || selectedEmail}</span>
                  {selectedConversation ? (
                    <BlockUserButton
                      otherUserId={selectedConversation}
                      onBlocked={() => {
                        setThreadBlocked(true);
                        void loadConversations();
                      }}
                    />
                  ) : null}
                </div>
                <ChatProductSummary productId={activeProductId} />
                {user && selectedConversation && productSellerId && user.id !== productSellerId ? (
                  <ChatBuyerOffersPanel
                    buyerId={user.id}
                    productId={activeProductId}
                    sellerId={productSellerId}
                  />
                ) : null}
                {user && selectedConversation ? (
                  <ChatTransactionPanel
                    userId={user.id}
                    otherUserId={selectedConversation}
                    productId={activeProductId}
                    userEmail={user.email}
                  />
                ) : null}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
                  {messages.map((msg) => {
                    const isSystem =
                      msg.message_type === 'system' ||
                      (msg as { is_system_message?: boolean }).is_system_message;

                    if (isSystem) {
                      return (
                        <ChatSystemMessageBubble
                          key={msg.id}
                          msg={msg}
                          viewerId={user.id}
                          otherUserId={selectedConversation!}
                          timeLocale={timeLocale}
                          sellerId={productSellerId}
                        />
                      );
                    }

                    return (
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
                          <img src={msg.media_url} alt={t('messages.chatImageAlt')} className="max-w-full rounded-lg" />
                        ) : (
                          msg.content
                        )}
                        <div className={`mt-1 text-[10px] ${msg.sender_id === user.id ? 'text-white/80' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="shrink-0 p-2.5 md:p-4 border-t border-gray-200 bg-white pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
                  {threadBlocked ? (
                    <p className="mb-2 text-center text-xs text-gray-500">{t('block.threadClosed')}</p>
                  ) : null}
                  <PaymentPresetChips
                    disabled={threadBlocked}
                    onInsert={(text) => setNewMessage((prev) => (prev ? `${prev} ${text}` : text))}
                  />
                  <form onSubmit={sendMessage} className="flex flex-nowrap items-center gap-2 max-w-full box-border">
                    {canMakeOffer ? (
                      <button
                        type="button"
                        onClick={() => setShowOfferModal(true)}
                        disabled={threadBlocked}
                        className="shrink-0 rounded-full border border-[#007782]/30 px-2.5 py-1.5 text-[10px] font-bold text-[#007782] hover:bg-[#007782]/5 touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t('messages.makeOffer')}
                      </button>
                    ) : null}
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
                      disabled={threadBlocked || uploadingImage}
                      className="icon-btn shrink-0 bg-gray-100 border border-gray-300 hover:bg-gray-200 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t('messages.uploadImage')}
                    >
                      {uploadingImage ? '…' : '📷'}
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('messages.placeholder')}
                      disabled={threadBlocked}
                      className="flex-1 min-w-0 min-h-11 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:border-[#007782] transition-all disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={threadBlocked}
                      className="icon-btn shrink-0 bg-[#007782] text-white font-medium hover:bg-[#00616b] transition-all min-h-11 min-w-11 disabled:opacity-50"
                      aria-label={t('messages.sendAria')}
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