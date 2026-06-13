import { getSetting } from '@/services/settings';
import { TelegramMessage } from '@/types';
import { prisma } from '@/lib/db';

const EMOJI_MAP: Record<string, string> = {
  NEW_PRODUCT: '🆕',
  NEW_COLLECTION: '👗',
  LIMITED_DROP: '🔥',
  RESTOCK: '🔄',
  PROMOTION: '🏷️',
  ADVERTISEMENT: '📢',
  NEWS: '📰',
  OTHER: '📌',
};

export async function sendTelegramMessage(msg: TelegramMessage): Promise<boolean> {
  const botToken = await getSetting('TELEGRAM_BOT_TOKEN');
  const chatId = await getSetting('TELEGRAM_CHAT_ID');

  if (!botToken || !chatId) {
    console.warn('[Telegram] Bot token or chat ID not configured');
    return false;
  }

  const emoji = EMOJI_MAP[msg.discoveryType] || '📌';
  const confidence = msg.confidence ? `${Math.round(msg.confidence * 100)}%` : 'N/A';
  
  const text = [
    `${emoji} <b>${msg.discoveryType.replace('_', ' ')}</b>`,
    ``,
    `<b>Brand:</b> ${escapeHtml(msg.brandName)}`,
    msg.productName ? `<b>Product:</b> ${escapeHtml(msg.productName)}` : '',
    msg.collectionName ? `<b>Collection:</b> ${escapeHtml(msg.collectionName)}` : '',
    `<b>Confidence:</b> ${confidence}`,
    ``,
    msg.summary ? `<i>${escapeHtml(msg.summary)}</i>` : '',
    ``,
    msg.url ? `<a href="${msg.url}">🔗 View Item</a>` : '',
    ``,
    `<i>🕐 ${msg.timestamp.toISOString().replace('T', ' ').substring(0, 19)} UTC</i>`,
  ].filter(Boolean).join('\n');

  try {
    if (msg.imageUrl) {
      await sendPhoto(botToken, chatId, msg.imageUrl, text);
    } else {
      await sendText(botToken, chatId, text);
    }
    return true;
  } catch (error) {
    console.error('[Telegram] Send error:', error);
    return false;
  }
}

async function sendText(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Telegram API error: ${JSON.stringify(err)}`);
  }
}

async function sendPhoto(token: string, chatId: string, photoUrl: string, caption: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption.substring(0, 1024),
      parse_mode: 'HTML',
    }),
  });

  if (!res.ok) {
    // Fall back to text
    await sendText(token, chatId, caption);
  }
}

export async function sendDailyDigest(stats: {
  productsFound: number;
  collectionsFound: number;
  dropsFound: number;
  brandsMonitored: number;
  date: Date;
}): Promise<boolean> {
  const botToken = await getSetting('TELEGRAM_BOT_TOKEN');
  const chatId = await getSetting('TELEGRAM_CHAT_ID');

  if (!botToken || !chatId) return false;

  const text = [
    `📊 <b>Daily Brand Monitor Digest</b>`,
    `📅 ${stats.date.toDateString()}`,
    ``,
    `🆕 New Products: <b>${stats.productsFound}</b>`,
    `👗 New Collections: <b>${stats.collectionsFound}</b>`,
    `🔥 Limited Drops: <b>${stats.dropsFound}</b>`,
    `👁️ Brands Monitored: <b>${stats.brandsMonitored}</b>`,
    ``,
    `<i>Brand Monitor is running smoothly.</i>`,
  ].join('\n');

  try {
    await sendText(botToken, chatId, text);
    return true;
  } catch {
    return false;
  }
}

export async function testTelegramConnection(botToken: string, chatId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ Brand Monitor connected successfully!',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { ok: false, error: err.description || 'Unknown error' };
    }

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function notifyDiscovery(discoveryId: string): Promise<void> {
  const discovery = await prisma.discovery.findUnique({
    where: { id: discoveryId },
    include: {
      brand: true,
      aiAnalysis: true,
      product: true,
      collection: true,
    },
  });

  if (!discovery || discovery.isNotified) return;

  const notification = await prisma.notification.create({
    data: {
      discoveryId,
      channel: 'TELEGRAM',
      status: 'PENDING',
    },
  });

  const msg: TelegramMessage = {
    brandName: discovery.brand.name,
    discoveryType: discovery.discoveryType,
    title: discovery.title,
    summary: discovery.aiAnalysis?.summary || discovery.summary || undefined,
    productName: discovery.aiAnalysis?.productName || discovery.product?.name || undefined,
    collectionName: discovery.aiAnalysis?.collectionName || discovery.collection?.name || undefined,
    imageUrl: discovery.imageUrls?.[0] || undefined,
    url: discovery.url || undefined,
    confidence: discovery.aiAnalysis?.confidence || discovery.confidenceScore || undefined,
    timestamp: discovery.createdAt,
  };

  const sent = await sendTelegramMessage(msg);

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: sent ? 'SENT' : 'FAILED',
      sentAt: sent ? new Date() : undefined,
      error: sent ? undefined : 'Failed to send',
    },
  });

  if (sent) {
    await prisma.discovery.update({
      where: { id: discoveryId },
      data: { isNotified: true, notifiedAt: new Date() },
    });
  }
}
