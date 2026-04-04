import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Открыть поиск по разделам', category: 'Навигация' },
  { keys: ['?'], description: 'Показать эту подсказку', category: 'Навигация' },
  { keys: ['Esc'], description: 'Закрыть диалог / отменить', category: 'Навигация' },
  { keys: ['Enter'], description: 'Подтвердить / сохранить', category: 'Формы' },
  { keys: ['Ctrl', 'Enter'], description: 'Сохранить в многострочных полях', category: 'Формы' },
];

const categories = [...new Set(shortcuts.map((s) => s.category))];

function KbdKey({ children }: { children: string }) {
  return (
    <kbd className="border-border bg-muted text-foreground inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border px-1.5 font-mono text-xs shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '?' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Горячие клавиши</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {category}
              </h4>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-foreground text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <span key={j} className="flex items-center gap-1">
                            <KbdKey>{key}</KbdKey>
                            {j < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t pt-3 text-center">
          <span className="text-muted-foreground text-xs">
            Нажмите <KbdKey>?</KbdKey> для вызова этой подсказки
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
