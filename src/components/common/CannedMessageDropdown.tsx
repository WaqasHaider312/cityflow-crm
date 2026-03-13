import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface CannedMessage {
  id: string;
  title: string;
  shortcut: string;
  message_text: string;
}

interface CannedMessageDropdownProps {
  query: string;           // text after the "/" trigger
  onSelect: (text: string) => void;
  onClose: () => void;
}

export function CannedMessageDropdown({ query, onSelect, onClose }: CannedMessageDropdownProps) {
  const [messages, setMessages] = useState<CannedMessage[]>([]);
  const [filtered, setFiltered] = useState<CannedMessage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch once on mount
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('canned_messages')
        .select('id, title, shortcut, message_text')
        .order('title');
      setMessages(data || []);
    };
    fetch();
  }, []);

  // Filter by query
  useEffect(() => {
    const q = query.toLowerCase();
    const results = messages.filter(m =>
      m.shortcut?.toLowerCase().includes(q) ||
      m.title.toLowerCase().includes(q)
    );
    setFiltered(results);
    setActiveIndex(0);
  }, [query, messages]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(filtered[activeIndex].message_text);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, activeIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      data-canned-dropdown
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-52 overflow-y-auto"
    >
      <div className="px-3 py-1.5 border-b border-border">
        <p className="text-xs text-muted-foreground font-medium">Canned Messages</p>
      </div>
      {filtered.map((msg, i) => (
        <button
          key={msg.id}
          className={cn(
            'w-full text-left px-3 py-2.5 transition-colors flex items-start gap-3',
            i === activeIndex ? 'bg-primary/10' : 'hover:bg-secondary'
          )}
          onMouseEnter={() => setActiveIndex(i)}
          onMouseDown={e => { e.preventDefault(); onSelect(msg.message_text); }}
        >
          <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
            {msg.shortcut || '/'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{msg.title}</p>
            <p className="text-xs text-muted-foreground truncate">{msg.message_text.slice(0, 60)}...</p>
          </div>
        </button>
      ))}
    </div>
  );
}