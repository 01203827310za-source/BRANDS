'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { X, Loader2 } from 'lucide-react';

interface BrandDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  brand?: any;
}

export default function BrandDialog({ open, onClose, onSave, brand }: BrandDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', websiteUrl: '', newArrivalsUrl: '', collectionsUrl: '',
    launchUrl: '', instagramHandle: '', instagramUrl: '', country: '',
    category: 'SPORTSWEAR', priority: 'MEDIUM', notes: '',
  });

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name || '',
        websiteUrl: brand.websiteUrl || '',
        newArrivalsUrl: brand.newArrivalsUrl || '',
        collectionsUrl: brand.collectionsUrl || '',
        launchUrl: brand.launchUrl || '',
        instagramHandle: brand.instagramHandle || '',
        instagramUrl: brand.instagramUrl || '',
        country: brand.country || '',
        category: brand.category || 'SPORTSWEAR',
        priority: brand.priority || 'MEDIUM',
        notes: brand.notes || '',
      });
    } else {
      setForm({ name: '', websiteUrl: '', newArrivalsUrl: '', collectionsUrl: '', launchUrl: '', instagramHandle: '', instagramUrl: '', country: '', category: 'SPORTSWEAR', priority: 'MEDIUM', notes: '' });
    }
  }, [brand, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = brand ? `/api/brands/${brand.id}` : '/api/brands';
      const method = brand ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      toast({ title: brand ? 'Brand updated' : 'Brand added', description: `${form.name} has been saved.` });
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">{brand ? 'Edit Brand' : 'Add New Brand'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Brand Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nike" required />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="US" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {['SPORTSWEAR', 'STREETWEAR', 'LUXURY', 'OUTDOOR', 'FASHION', 'FOOTWEAR', 'OTHER'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {['HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Website URL</Label>
            <Input type="url" value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://www.nike.com" />
          </div>
          <div className="space-y-1.5">
            <Label>New Arrivals URL</Label>
            <Input type="url" value={form.newArrivalsUrl} onChange={e => setForm(f => ({ ...f, newArrivalsUrl: e.target.value }))} placeholder="https://www.nike.com/w/new-releases" />
          </div>
          <div className="space-y-1.5">
            <Label>Collections URL</Label>
            <Input type="url" value={form.collectionsUrl} onChange={e => setForm(f => ({ ...f, collectionsUrl: e.target.value }))} placeholder="https://www.nike.com/collections" />
          </div>
          <div className="space-y-1.5">
            <Label>Launch URL</Label>
            <Input type="url" value={form.launchUrl} onChange={e => setForm(f => ({ ...f, launchUrl: e.target.value }))} placeholder="https://www.nike.com/launches" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Instagram Handle</Label>
              <Input value={form.instagramHandle} onChange={e => setForm(f => ({ ...f, instagramHandle: e.target.value }))} placeholder="nike" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram URL</Label>
              <Input type="url" value={form.instagramUrl} onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))} placeholder="https://www.instagram.com/nike/" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about this brand" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : (brand ? 'Save Changes' : 'Add Brand')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
