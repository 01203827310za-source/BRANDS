'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Save, Loader2, CheckCircle, XCircle, Send, RefreshCw, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Settings saved successfully' });
    } catch {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const testTelegram = async () => {
    setTestingTelegram(true);
    setTelegramStatus('idle');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-telegram',
          botToken: settings.TELEGRAM_BOT_TOKEN,
          chatId: settings.TELEGRAM_CHAT_ID,
        }),
      });
      const data = await res.json();
      setTelegramStatus(data.ok ? 'ok' : 'fail');
      if (data.ok) {
        toast({ title: 'Telegram connected!', description: 'Test message sent successfully.' });
      } else {
        toast({ title: 'Telegram failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      setTelegramStatus('fail');
    } finally {
      setTestingTelegram(false);
    }
  };

  const update = (key: string, val: string) => setSettings(s => ({ ...s, [key]: val }));

  const Section = ({ title, description, children }: any) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/20">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );

  const Field = ({ label, id, type = 'text', placeholder, value, onChange, hint }: any) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} value={value || ''} onChange={e => onChange(e.target.value)} className={type === 'password' ? 'font-mono' : ''} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  if (loading) {
    return (
      <>
        <Header title="Settings" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Settings"
        description="Configure API keys, notifications, and crawler behavior"
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Settings</>}
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Telegram */}
        <Section title="📱 Telegram Notifications" description="Configure your Telegram bot to receive instant alerts">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bot Token" id="bot-token" type="password" placeholder="1234567890:ABC..." value={settings.TELEGRAM_BOT_TOKEN} onChange={(v: string) => update('TELEGRAM_BOT_TOKEN', v)} hint="Get from @BotFather on Telegram" />
            <Field label="Chat ID" id="chat-id" placeholder="-1001234567890" value={settings.TELEGRAM_CHAT_ID} onChange={(v: string) => update('TELEGRAM_CHAT_ID', v)} hint="Your chat or group ID" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={testTelegram} disabled={testingTelegram || !settings.TELEGRAM_BOT_TOKEN || !settings.TELEGRAM_CHAT_ID}>
              {testingTelegram ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send Test Message
            </Button>
            {telegramStatus === 'ok' && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3.5 w-3.5" />Connected</span>}
            {telegramStatus === 'fail' && <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" />Failed</span>}
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <strong>Setup:</strong> Create a bot with @BotFather → copy the token → add the bot to your group → get the group chat ID by messaging @userinfobot
          </div>
        </Section>

        {/* AI */}
        <Section title="🤖 AI Analysis" description="Configure AI provider for discovery classification">
          <div className="space-y-1.5">
            <Label>AI Provider</Label>
            <select value={settings.AI_PROVIDER || 'groq'} onChange={e => update('AI_PROVIDER', e.target.value)} className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="groq">Groq (Llama 3.3 70B)</option>
              <option value="openai">OpenAI (GPT-4o mini)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Groq API Key" id="groq-key" type="password" placeholder="gsk_..." value={settings.GROQ_API_KEY} onChange={(v: string) => update('GROQ_API_KEY', v)} hint="Get from console.groq.com" />
            <Field label="OpenAI API Key" id="openai-key" type="password" placeholder="sk-..." value={settings.OPENAI_API_KEY} onChange={(v: string) => update('OPENAI_API_KEY', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Confidence Threshold" id="confidence" type="number" placeholder="0.6" value={settings.AI_CONFIDENCE_THRESHOLD} onChange={(v: string) => update('AI_CONFIDENCE_THRESHOLD', v)} hint="0.0–1.0. Discoveries below this are ignored." />
            <Field label="Importance Threshold" id="importance" type="number" placeholder="0.5" value={settings.IMPORTANCE_THRESHOLD} onChange={(v: string) => update('IMPORTANCE_THRESHOLD', v)} hint="0.0–1.0. Only notify above this score." />
          </div>
        </Section>

        {/* Crawler */}
        <Section title="🕷️ Crawler Settings" description="Control crawl frequency and behavior">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Crawl Interval (minutes)" id="crawl-interval" type="number" placeholder="60" value={settings.CRAWL_INTERVAL_MINUTES} onChange={(v: string) => update('CRAWL_INTERVAL_MINUTES', v)} hint="How often to check brand websites" />
            <Field label="Web Search Interval (hours)" id="search-interval" type="number" placeholder="24" value={settings.SEARCH_INTERVAL_HOURS} onChange={(v: string) => update('SEARCH_INTERVAL_HOURS', v)} hint="How often to run web searches" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Max Retries" id="retries" type="number" placeholder="3" value={settings.MAX_RETRIES} onChange={(v: string) => update('MAX_RETRIES', v)} hint="Retry attempts on crawl failure" />
            <Field label="Daily Digest Hour (UTC)" id="digest-hour" type="number" placeholder="8" value={settings.DAILY_DIGEST_HOUR} onChange={(v: string) => update('DAILY_DIGEST_HOUR', v)} hint="Hour 0-23 for daily summary" />
          </div>
        </Section>

        {/* Notifications */}
        <Section title="🔔 Notification Rules" description="Control which events trigger Telegram notifications">
          <div className="space-y-1.5">
            <Label>Notify For (comma-separated types)</Label>
            <Input value={settings.NOTIFICATION_TYPES || ''} onChange={e => update('NOTIFICATION_TYPES', e.target.value)} placeholder="NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP,RESTOCK" />
            <p className="text-xs text-muted-foreground">Options: NEW_PRODUCT, NEW_COLLECTION, LIMITED_DROP, RESTOCK, PROMOTION, NEWS</p>
          </div>
        </Section>

        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save All Settings</>}
          </Button>
        </div>
      </div>
    </>
  );
}
