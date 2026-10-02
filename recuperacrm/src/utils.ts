/**
 * Currency and formatting utilities
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
}

export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getWhatsAppLink(phone: string, text?: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const withCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encodedText = text ? encodeURIComponent(text) : '';
  return `https://wa.me/${withCountry}${encodedText ? `?text=${encodedText}` : ''}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Avatar style helper for operators (Helena and Ymalaia)
 * Discreet and harmonious with CRM design system
 */
export function getOwnerAvatarColor(owner?: string, avatar?: string): {
  badge: string;
  bg: string;
  text: string;
} {
  const isYmalaia =
    (owner && owner.toLowerCase().startsWith('y')) ||
    (avatar && avatar.toUpperCase() === 'Y');

  if (isYmalaia) {
    return {
      badge: 'bg-teal-100/90 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-200/80 dark:border-teal-700/80',
      bg: 'bg-teal-100/90 dark:bg-teal-950',
      text: 'text-teal-800 dark:text-teal-200'
    };
  }

  // Helena (H)
  return {
    badge: 'bg-indigo-100/90 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-200/80 dark:border-indigo-700/80',
    bg: 'bg-indigo-100/90 dark:bg-indigo-950',
    text: 'text-indigo-800 dark:text-indigo-200'
  };
}

/**
 * Formats a contact or client name to Title Case (Maiúsculas e Minúsculas),
 * keeping common Portuguese prepositions in lowercase (de, da, do, dos, das, e).
 * Example: "BEATRIZ CARVALHO" -> "Beatriz Carvalho", "CARLOS EDUARDO SILVA" -> "Carlos Eduardo Silva"
 */
export function formatPersonName(name?: string): string {
  if (!name) return '';
  const lowerPrepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return '';
      if (index > 0 && lowerPrepositions.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

