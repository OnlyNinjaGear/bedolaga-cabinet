import { useState } from 'react';
import { getColorGradient } from '@/utils/colorParser';
import { ThemeIcon } from './ThemeIcon';
import type { BlockRendererProps } from './types';
import { Button } from '@/components/ui/button';

export function AccordionBlock({
  blocks,
  isMobile,
  isLight,
  getLocalizedText,
  getSvgHtml,
  renderBlockButtons,
}: BlockRendererProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const visibleBlocks = blocks.filter(
    (b) => getLocalizedText(b.title) || getLocalizedText(b.description) || b.buttons?.length,
  );

  if (!visibleBlocks.length) return null;

  return (
    <div className="space-y-2">
      {visibleBlocks.map((block, index) => {
        const gradientStyle = getColorGradient(block.svgIconColor || 'cyan', isLight);
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className={`overflow-hidden rounded-2xl border transition-colors ${
              isLight
                ? isOpen
                  ? 'border-primary/30 bg-card/80 shadow-sm'
                  : 'border-border/60 bg-card/60'
                : isOpen
                  ? 'border-primary/30 bg-card/50'
                  : 'border-border/50 bg-card/50'
            }`}
          >
            {/* Control */}
            <Button
              variant="ghost"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex h-auto w-full items-center justify-start gap-3 p-4 text-left"
            >
              <ThemeIcon
                getSvgHtml={getSvgHtml}
                svgIconKey={block.svgIconKey}
                gradientStyle={gradientStyle}
                isMobile={isMobile}
              />
              <span className="text-foreground min-w-0 flex-1 truncate font-semibold">
                {getLocalizedText(block.title)}
              </span>
              <svg
                className={`text-muted-foreground h-4.5 w-4.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            {/* Panel */}
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {getLocalizedText(block.description)}
                </p>
                {renderBlockButtons(block.buttons, 'light')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
