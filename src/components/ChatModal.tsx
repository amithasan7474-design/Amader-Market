import React, { useEffect, useRef, useState } from 'react';
import { Bot, Copy, Phone, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import { db, onValue, push, ref, remove, update } from '../services/firebase';
import type { ChatMessage, LangCode, SiteSettings, UserProfile } from '../types/marketplace';
import { formatDateShort, getRoleLabel, isMainSuperAdminAccount } from '../utils/i18n';
import { useConfirm } from './ConfirmProvider';

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
  targetName: string;
  currentUid: string;
  currentName: string;
  currentEmail?: string;
  currentRole: string;
  lang: LangCode;
  siteSettings?: SiteSettings;
  users?: UserProfile[];
  isMainSuperAdmin?: boolean;
  isAssistantSuperAdmin?: boolean;
  isSupportChat?: boolean;
  onMarkSeen?: (chatId: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const BOT_UID = 'amader_assistant_bot';

export const ChatModal: React.FC<ChatModalProps> = ({
  open,
  onClose,
  chatId,
  targetName,
  currentUid,
  currentName,
  currentEmail = '',
  currentRole,
  lang,
  siteSettings,
  users = [],
  isMainSuperAdmin = false,
  isAssistantSuperAdmin = false,
  isSupportChat = false,
  onMarkSeen,
  onNotify,
}) => {
  const confirm = useConfirm();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastBotTimeRef = useRef<number>(0);

  const mainSupportPhone = (
    siteSettings?.mainSuperAdminSupportPhone ||
    siteSettings?.adminWaNumber ||
    siteSettings?.contactPhone ||
    ''
  ).trim();
  const subSupportPhone = (siteSettings?.assistantSuperAdminSupportPhone || '').trim();

  useEffect(() => {
    if (!open || !chatId) return;
    if (onMarkSeen) onMarkSeen(chatId);

    const msgRef = ref(db, `chats/${chatId}/messages`);
    const unsub = onValue(msgRef, (snap) => {
      const val = snap.val();
      if (val) {
        const list = Object.keys(val).map((k) => ({ id: k, ...val[k] })) as ChatMessage[];
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(list);
      } else {
        setMessages([]);
      }
      if (onMarkSeen) onMarkSeen(chatId);
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 100);
    });

    const metaRef = ref(db, `chats/${chatId}/meta`);
    onValue(
      metaRef,
      (snap) => {
        const m = snap.val();
        if (m && m.lastSender !== currentUid && m.unread > 0) {
          update(metaRef, { unread: 0 });
        }
      },
      { onlyOnce: true }
    );

    return () => unsub();
  }, [open, chatId, currentUid, onMarkSeen]);

  if (!open || !chatId) return null;

  const isStaff = isMainSuperAdmin || isAssistantSuperAdmin;

  const buildBotReply = (userText: string): { botName: string; botText: string } => {
    const hasBangla = /[\u0980-\u09FF]/.test(userText);
    const hasEnglish = /[a-zA-Z]/.test(userText);
    const replyLang: LangCode = hasBangla ? 'bn' : hasEnglish ? 'en' : lang;

    if (replyLang === 'bn') {
      const lines: string[] = [
        'আসসালামু আলাইকুম! আমি আমাদের মার্কেটের এসিস্ট্যান্ট।',
        'আপনার মেসেজটি সফলভাবে মেইন সুপার এডমিন এবং সহকারী সুপার এডমিনের ইনবক্সে পৌঁছে গেছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন — আমাদের এজেন্ট, সহকারী সুপার এডমিন অথবা মেইন সুপার এডমিন আসলেই আপনার মেসেজের রিপ্লাই দেওয়া হবে।',
      ];
      if (mainSupportPhone || subSupportPhone) {
        lines.push('');
        lines.push('জরুরি প্রয়োজনে সরাসরি আমাদের সাপোর্ট নাম্বারে যোগাযোগ করতে পারেন:');
        if (mainSupportPhone) lines.push(`• মেইন সুপার এডমিন সাপোর্ট: ${mainSupportPhone}`);
        if (subSupportPhone) lines.push(`• সহকারী সুপার এডমিন সাপোর্ট: ${subSupportPhone}`);
      }
      return {
        botName: 'আমাদের মার্কেটের এসিস্ট্যান্ট',
        botText: lines.join('\n'),
      };
    }

    const lines: string[] = [
      'Hello! I am Amader Market Assistant.',
      'Your message has been sent directly to both our Main Super Admin and Assistant Super Admin. Please wait a moment — as soon as our agent or admin comes online, you will receive a reply.',
    ];
    if (mainSupportPhone || subSupportPhone) {
      lines.push('');
      lines.push('For urgent assistance, please contact our Support Numbers:');
      if (mainSupportPhone) lines.push(`• Main Super Admin Support: ${mainSupportPhone}`);
      if (subSupportPhone) lines.push(`• Assistant Super Admin Support: ${subSupportPhone}`);
    }
    return {
      botName: 'Amader Market Assistant',
      botText: lines.join('\n'),
    };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msgText = text.trim();
    const now = Date.now();
    setText('');

    const resolvedRole = isMainSuperAdmin
      ? 'main_super_admin'
      : isAssistantSuperAdmin
      ? 'super_admin'
      : currentRole;

    await push(ref(db, `chats/${chatId}/messages`), {
      senderId: currentUid,
      senderName: currentName,
      senderEmail: currentEmail,
      senderRole: resolvedRole,
      text: msgText,
      timestamp: now,
    });
    await update(ref(db, `chats/${chatId}/meta`), {
      lastMessage: msgText,
      lastSender: currentUid,
      lastTimestamp: now,
      unread: 1,
      isSupport: isSupportChat || targetName.toLowerCase().includes('admin'),
    });

    const looksLikeSupportChat =
      isSupportChat || targetName.toLowerCase().includes('admin');
    if (!isStaff && looksLikeSupportChat) {
      const recentBotExists = messages.some(
        (m) => (m.isBot || m.senderId === BOT_UID) && now - (m.timestamp || 0) < 45000
      );
      if (!recentBotExists && now - lastBotTimeRef.current > 45000) {
        lastBotTimeRef.current = now;
        const { botName, botText } = buildBotReply(msgText);
        setTimeout(async () => {
          await push(ref(db, `chats/${chatId}/messages`), {
            senderId: BOT_UID,
            senderName: botName,
            senderRole: 'bot',
            isBot: true,
            text: botText,
            timestamp: Date.now(),
          });
        }, 420);
      }
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!isMainSuperAdmin || !chatId) return;
    const targetMsg = messages.find((x) => x.id === msgId);
    const ok = await confirm({
      title: lang === 'bn' ? 'এসএমএস ডিলিট কনফার্মেশন' : 'Confirm Delete SMS',
      message:
        lang === 'bn'
          ? 'আপনি কি সত্যিই এই এসএমএসটি স্থায়ীভাবে ডিলিট করতে চান?'
          : 'Are you sure you want to permanently delete this message?',
      detail: targetMsg?.text ? targetMsg.text.slice(0, 120) : undefined,
      tone: 'danger',
    });
    if (!ok) return;
    await remove(ref(db, `chats/${chatId}/messages/${msgId}`));
    const remaining = messages.filter((x) => x.id !== msgId);
    const last = remaining[remaining.length - 1];
    await update(ref(db, `chats/${chatId}/meta`), {
      lastMessage: last ? last.text : '',
      lastSender: last ? last.senderId : '',
      lastTimestamp: last ? last.timestamp : 0,
      unread: 0,
    });
    if (onNotify) {
      onNotify(lang === 'bn' ? 'এসএমএস ডিলিট হয়েছে।' : 'Message deleted.', 'info');
    }
  };

  const handleDeleteEntireChat = async () => {
    if (!isMainSuperAdmin || !chatId) return;
    const ok = await confirm({
      title: lang === 'bn' ? 'সম্পূর্ণ চ্যাট ডিলিট করবেন?' : 'Delete Entire Conversation?',
      message:
        lang === 'bn'
          ? `"${targetName}" এর সাথে সম্পূর্ণ কথোপকথন ও সব এসএমএস কি স্থায়ীভাবে ডিলিট করতে চান?`
          : `Are you sure you want to permanently delete the entire chat with "${targetName}"?`,
      tone: 'danger',
    });
    if (!ok) return;
    await remove(ref(db, `chats/${chatId}`));
    if (onNotify) {
      onNotify(lang === 'bn' ? 'সম্পূর্ণ চ্যাট ডিলিট করা হয়েছে।' : 'Conversation deleted.', 'info');
    }
    onClose();
  };

  const resolveSenderLabel = (m: ChatMessage): string => {
    if (m.isBot || m.senderId === BOT_UID) {
      return m.senderName || (lang === 'bn' ? 'আমাদের মার্কেটের এসিস্ট্যান্ট' : 'Amader Market Assistant');
    }
    const u = users.find((x) => x.uid === m.senderId);
    const email = m.senderEmail || u?.email;
    const roleVal = m.senderRole || u?.role || '';
    if (isMainSuperAdminAccount(email) || roleVal === 'main_super_admin') {
      return `${lang === 'bn' ? 'মেইন সুপার এডমিন' : 'Main Super Admin'} · ${m.senderName}`;
    }
    if (
      roleVal === 'super_admin' ||
      roleVal === 'Super Admin' ||
      roleVal === 'assistant_super_admin'
    ) {
      return `${lang === 'bn' ? 'সহকারী সুপার এডমিন' : 'Assistant Super Admin'} · ${m.senderName}`;
    }
    if (roleVal && roleVal !== 'user' && roleVal !== 'guest') {
      return `${getRoleLabel(roleVal, email, lang)} · ${m.senderName}`;
    }
    return m.senderName;
  };

  const copyPhone = (num: string) => {
    navigator.clipboard.writeText(num);
    if (onNotify) {
      onNotify(
        lang === 'bn' ? `সাপোর্ট নাম্বার কপি হয়েছে: ${num}` : `Copied: ${num}`,
        'success'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md h-[84vh] sm:h-[620px] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-950 shadow-2xl overflow-hidden">
        <div className="h-14 px-4 border-b border-slate-200 dark:border-emerald-950 flex items-center justify-between bg-[#043934] text-white shrink-0">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate flex items-center gap-1.5">
              {isSupportChat && <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />}
              <span className="truncate">{targetName}</span>
            </div>
            <div className="text-[11px] text-teal-100/80">
              {isSupportChat
                ? lang === 'bn'
                  ? 'মেইন ও সহকারী সুপার এডমিন সাপোর্ট ডেস্ক'
                  : 'Main & Assistant Super Admin Support Desk'
                : lang === 'bn'
                ? 'লাইভ মেসেজিং'
                : 'Live Messaging'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isMainSuperAdmin && (
              <button
                type="button"
                onClick={handleDeleteEntireChat}
                title={lang === 'bn' ? 'সম্পূর্ণ চ্যাট ডিলিট (মেইন সুপার এডমিন)' : 'Delete Entire Chat'}
                className="min-w-[36px] min-h-[36px] px-2 flex items-center justify-center gap-1 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'bn' ? 'ডিলিট' : 'Delete'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {(isSupportChat || targetName.toLowerCase().includes('admin')) &&
          (mainSupportPhone || subSupportPhone) && (
            <div className="px-3.5 py-2 bg-emerald-50 dark:bg-[#071917] border-b border-emerald-200/80 dark:border-emerald-900/70 space-y-1.5 shrink-0">
              <div className="text-[11px] font-bold text-emerald-900 dark:text-amber-300">
                {lang === 'bn' ? 'সরাসরি হেল্পলাইন / সাপোর্ট নাম্বার:' : 'Direct Support Helplines:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {mainSupportPhone && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#0d1f1d] border border-emerald-200 dark:border-emerald-800 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'মেইন SA:' : 'Main SA:'}
                    </span>
                    <a
                      href={`tel:${mainSupportPhone}`}
                      className="font-mono-num font-bold text-emerald-800 dark:text-amber-300 inline-flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{mainSupportPhone}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyPhone(mainSupportPhone)}
                      className="p-0.5 text-slate-400 hover:text-emerald-700"
                      title="Copy"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {subSupportPhone && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#0d1f1d] border border-emerald-200 dark:border-emerald-800 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'সহকারী SA:' : 'Sub SA:'}
                    </span>
                    <a
                      href={`tel:${subSupportPhone}`}
                      className="font-mono-num font-bold text-emerald-800 dark:text-amber-300 inline-flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{subSupportPhone}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyPhone(subSupportPhone)}
                      className="p-0.5 text-slate-400 hover:text-emerald-700"
                      title="Copy"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f6f8f7] dark:bg-[#071312]">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-10 space-y-2">
              <div className="font-semibold text-slate-600 dark:text-slate-300">
                {lang === 'bn'
                  ? 'আপনার যেকোনো প্রশ্ন বা সমস্যার কথা নিচে লিখে পাঠান...'
                  : 'Send a message to start the conversation...'}
              </div>
              {isSupportChat && (
                <div className="text-[11px] opacity-80">
                  {lang === 'bn'
                    ? 'মেইন সুপার এডমিন এবং সহকারী সুপার এডমিন দুজনই আপনার মেসেজ দেখতে ও রিপ্লাই দিতে পারবেন।'
                    : 'Both Main Super Admin and Assistant Super Admin can view and reply to your message.'}
                </div>
              )}
            </div>
          ) : (
            messages.map((m) => {
              const isBot = Boolean(m.isBot || m.senderId === BOT_UID);
              const mine = m.senderId === currentUid && !isBot;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      isBot
                        ? 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-slate-800 dark:text-slate-100'
                        : mine
                        ? 'bg-emerald-800 text-white dark:bg-amber-500 dark:text-slate-950'
                        : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${
                        isBot
                          ? 'text-sky-700 dark:text-sky-300'
                          : mine
                          ? 'opacity-85'
                          : 'text-emerald-700 dark:text-amber-300'
                      }`}
                    >
                      {isBot && <Bot className="w-3 h-3 shrink-0" />}
                      <span>{resolveSenderLabel(m)}</span>
                    </div>
                    <div className="break-words whitespace-pre-line leading-relaxed">{m.text}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>{formatDateShort(m.timestamp, lang)}</span>
                    {isMainSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        title={lang === 'bn' ? 'এই এসএমএস ডিলিট করুন' : 'Delete SMS'}
                        className="text-rose-500 hover:text-rose-600 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-emerald-950 flex gap-2 bg-white dark:bg-[#0b1b19] shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={lang === 'bn' ? 'মেসেজ লিখুন...' : 'Type a message...'}
            className="flex-1 h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
          />
          <button
            type="submit"
            className="w-11 h-11 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
