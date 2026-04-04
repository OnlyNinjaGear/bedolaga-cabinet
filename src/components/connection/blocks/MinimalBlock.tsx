import { getColorGradient } from '@/utils/colorParser';
import { ThemeIcon } from './ThemeIcon';
import type { BlockRendererProps } from './types';

export function MinimalBlock({
  blocks,
  isMobile,
  isLight,
  getLocalizedText,
  getSvgHtml,
  renderBlockButtons,
}: BlockRendererProps) {
  const visibleBlocks = blocks.filter(
    (b) => getLocalizedText(b.title) || getLocalizedText(b.description) || b.buttons?.length,
  );

  if (!visibleBlocks.length) return null;

  return (
    <div>
      {visibleBlocks.map((block, index) => {
        const gradientStyle = getColorGradient(block.svgIconColor || 'cyan', isLight);
        const isLast = index === visibleBlocks.length - 1;

        return (
          <div
            key={index}
            className={
              isLast
                ? 'pb-4'
                : `mb-4 border-b pb-4 ${isLight ? 'border-border/40' : 'border-border/50'}`
            }
          >
            <div className="mb-2 flex items-center gap-3">
              <ThemeIcon
                getSvgHtml={getSvgHtml}
                svgIconKey={block.svgIconKey}
                gradientStyle={gradientStyle}
                isMobile={isMobile}
              />
              <span className="text-foreground font-medium">{getLocalizedText(block.title)}</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {getLocalizedText(block.description)}
            </p>
            {renderBlockButtons(block.buttons, 'subtle')}
          </div>
        );
      })}
    </div>
  );
}
