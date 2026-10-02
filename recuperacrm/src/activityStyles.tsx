import React from 'react';
import {
  MessageCircle,
  Phone,
  CreditCard,
  FileText,
  Clock
} from 'lucide-react';

export type ActivityChannel = 'whatsapp' | 'call' | 'payment' | 'note' | 'system';

export interface ActivityChannelStyle {
  label: string;
  icon: (className?: string) => React.ReactNode;
  iconColor: string;
  iconBox: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeClasses: string;
  timelineBg: string;
  btnSelected: string;
  btnUnselected: string;
}

export const ACTIVITY_CHANNEL_STYLES: Record<string, ActivityChannelStyle> = {
  whatsapp: {
    label: 'WhatsApp',
    icon: (className = 'w-3.5 h-3.5') => (
      <MessageCircle className={className} strokeWidth={2.2} fill="currentColor" fillOpacity={0.15} />
    ),
    iconColor: 'text-[#25D366]',
    iconBox: 'bg-[#25D366] text-white shadow-xs border border-[#1ebd56]',
    badgeBg: 'bg-[#25D366]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#1ebd56]',
    badgeClasses: 'bg-[#25D366] text-white border border-[#1ebd56] font-bold shadow-2xs',
    timelineBg: 'bg-[#25D366] text-white shadow-xs shadow-[#25D366]/40',
    btnSelected: 'bg-[#25D366] text-white border-[#1ebd56] shadow-xs ring-2 ring-[#25D366]/35 font-bold',
    btnUnselected: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800 hover:bg-green-100/80 dark:hover:bg-green-900/50 font-semibold'
  },
  call: {
    label: 'Ligação',
    icon: (className = 'w-3.5 h-3.5') => (
      <Phone className={className} strokeWidth={2.2} fill="currentColor" fillOpacity={0.15} />
    ),
    iconColor: 'text-[#0284c7]',
    iconBox: 'bg-[#0284c7] text-white shadow-xs border border-sky-600/40',
    badgeBg: 'bg-[#0284c7]',
    badgeText: 'text-white',
    badgeBorder: 'border-sky-600',
    badgeClasses: 'bg-[#0284c7] text-white border border-sky-600 font-bold shadow-2xs',
    timelineBg: 'bg-[#0284c7] text-white shadow-xs shadow-sky-500/30',
    btnSelected: 'bg-[#0284c7] text-white border-sky-600 shadow-xs ring-2 ring-sky-500/30 font-bold',
    btnUnselected: 'bg-sky-50/90 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-400/90 dark:border-sky-700/80 hover:bg-sky-100 dark:hover:bg-sky-900/50 font-semibold'
  },
  payment: {
    label: 'Pagamento',
    icon: (className = 'w-3.5 h-3.5') => (
      <CreditCard className={className} strokeWidth={2.3} fill="currentColor" fillOpacity={0.2} />
    ),
    iconColor: 'text-[#064e3b] dark:text-emerald-400',
    iconBox: 'bg-[#064e3b] text-white shadow-xs border border-[#043628]',
    badgeBg: 'bg-[#064e3b]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#043628]',
    badgeClasses: 'bg-[#064e3b] text-white border border-[#043628] font-bold shadow-2xs',
    timelineBg: 'bg-[#064e3b] text-white shadow-xs shadow-emerald-950/40',
    btnSelected: 'bg-[#064e3b] text-white border-[#043628] shadow-xs ring-2 ring-emerald-950/40 font-bold',
    btnUnselected: 'bg-emerald-950/10 dark:bg-emerald-950/60 text-[#064e3b] dark:text-emerald-200 border-2 border-[#064e3b]/50 dark:border-emerald-600/70 hover:bg-emerald-950/20 font-bold'
  },
  note: {
    label: 'Anotação',
    icon: (className = 'w-3.5 h-3.5') => (
      <FileText className={className} strokeWidth={2.2} fill="currentColor" fillOpacity={0.15} />
    ),
    iconColor: 'text-[#d97706]',
    iconBox: 'bg-[#d97706] text-white shadow-xs border border-amber-600/40',
    badgeBg: 'bg-[#d97706]',
    badgeText: 'text-white',
    badgeBorder: 'border-amber-600',
    badgeClasses: 'bg-[#d97706] text-white border border-amber-600 font-bold shadow-2xs',
    timelineBg: 'bg-[#d97706] text-white shadow-xs shadow-amber-500/30',
    btnSelected: 'bg-[#d97706] text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30 font-bold',
    btnUnselected: 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-400/90 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-semibold'
  },
  system: {
    label: 'Sistema',
    icon: (className = 'w-3.5 h-3.5') => (
      <Clock className={className} strokeWidth={2.2} />
    ),
    iconColor: 'text-slate-600',
    iconBox: 'bg-slate-600 text-white shadow-xs border border-slate-700',
    badgeBg: 'bg-slate-700',
    badgeText: 'text-white',
    badgeBorder: 'border-slate-800',
    badgeClasses: 'bg-slate-700 text-white border border-slate-800 font-bold shadow-2xs',
    timelineBg: 'bg-slate-600 text-white shadow-xs',
    btnSelected: 'bg-slate-700 text-white border-slate-700 shadow-xs',
    btnUnselected: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
  }
};

export function getActivityStyle(channel?: string): ActivityChannelStyle {
  if (channel && ACTIVITY_CHANNEL_STYLES[channel]) {
    return ACTIVITY_CHANNEL_STYLES[channel];
  }
  return ACTIVITY_CHANNEL_STYLES.system;
}
