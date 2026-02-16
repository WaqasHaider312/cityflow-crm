import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, HelpCircle, Search, GripVertical } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'payments',  label: 'Payments'   },
  { value: 'orders',    label: 'Orders'     },
  { value: 'returns',   label: 'Returns'    },
  { value: 'app',       label: 'App Issues' },
  { value: 'general',   label: 'General'    },
];

const CATEGORY_COLORS: Record<string, string> = {
  payments: 'bg-green-100 text-green-700',
  orders:   'bg-blue-100 text-blue-700',
  returns:  'bg-orange-100 text-orange-700',
  app:      'bg-purple-100 text-purple-700',
  general:  'bg-gray-100 text-gray-700',
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function FAQs() {
  const [loading,     setLoading]     = useState(true);
  const [faqs,        setFaqs]        = useState<FAQ[]>([]);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editingFaq,  setEditingFaq]  = useState<FAQ | null>(null);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('all');
  const [submitting,  setSubmitting]  = useState(false);

  // Form state
  const [question,    setQuestion]    = useState('');
  const [answer,      setAnswer]      = useState('');
  const [category,    setCategory]    = useState('general');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => { fetchFaqs(); }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('faqs')
      .select('id, category, question, answer, order_index, is_published, created_at')
      .order('category')
      .order('order_index');

    if (error) {
      toast({ title: 'Error loading FAQs', variant: 'destructive' });
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setCategory('general');
    setIsPublished(true);
    setEditingFaq(null);
  };

  const handleOpenDialog = (faq: FAQ | null = null) => {
    if (faq) {
      setEditingFaq(faq);
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setCategory(faq.category);
      setIsPublished(faq.is_published);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!question.trim()) { toast({ title: 'Question is required', variant: 'destructive' }); return; }
    if (!answer.trim())   { toast({ title: 'Answer is required',   variant: 'destructive' }); return; }

    setSubmitting(true);
    try {
      if (editingFaq) {
        const { error } = await supabase
          .from('faqs')
          .update({ question: question.trim(), answer: answer.trim(), category, is_published: isPublished, updated_at: new Date().toISOString() })
          .eq('id', editingFaq.id);
        if (error) throw error;
        toast({ title: 'FAQ updated' });
      } else {
        const maxIndex = faqs.filter((f) => f.category === category).length;
        const { error } = await supabase
          .from('faqs')
          .insert({ question: question.trim(), answer: answer.trim(), category, is_published: isPublished, order_index: maxIndex });
        if (error) throw error;
        toast({ title: 'FAQ created' });
      }

      setDialogOpen(false);
      resetForm();
      fetchFaqs();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error saving FAQ', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, question: string) => {
    if (!confirm(`Delete FAQ "${question.slice(0, 50)}..."? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'FAQ deleted' });
      fetchFaqs();
    } catch (error) {
      toast({ title: 'Error deleting FAQ', variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (faq: FAQ) => {
    const { error } = await supabase
      .from('faqs')
      .update({ is_published: !faq.is_published, updated_at: new Date().toISOString() })
      .eq('id', faq.id);

    if (error) {
      toast({ title: 'Error updating FAQ', variant: 'destructive' });
    } else {
      setFaqs((prev) => prev.map((f) => f.id === faq.id ? { ...f, is_published: !f.is_published } : f));
    }
  };

  const filtered = faqs.filter((f) => {
    const matchSearch = search === '' ||
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || f.category === filterCat;
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">FAQs</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">Loading FAQs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">FAQs</h1>
          <p className="text-muted-foreground mt-1">Manage help content shown to suppliers</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filtered.length} FAQ{filtered.length !== 1 ? 's' : ''}
          {' · '}
          {faqs.filter((f) => f.is_published).length} published
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="w-8"></TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No FAQs found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((faq) => (
                <TableRow key={faq.id} className={!faq.is_published ? 'opacity-50' : ''}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-sm">
                      <p className="font-medium text-foreground text-sm line-clamp-1">{faq.question}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{faq.answer}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[faq.category] ?? 'bg-muted text-muted-foreground'}`}>
                      {faq.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={faq.is_published}
                      onCheckedChange={() => handleTogglePublish(faq)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(faq.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleOpenDialog(faq)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="w-8 h-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(faq.id, faq.question)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
            <DialogDescription>
              {editingFaq ? 'Update this FAQ' : 'Create a new FAQ for the supplier helpline'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. How do I track my payment?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Answer <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Write a clear, helpful answer..."
                className="min-h-[120px] resize-none"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="published" className="cursor-pointer">Publish immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}