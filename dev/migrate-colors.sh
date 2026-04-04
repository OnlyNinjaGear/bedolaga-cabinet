#!/bin/bash
# ============================================================
# Migrate legacy dark/champagne/accent colors → shadcn tokens
# Run from bedolaga-cabinet root: bash dev/migrate-colors.sh
# ============================================================

set -e
cd "$(dirname "$0")/.."

echo "🎨 Migrating colors to shadcn tokens..."
echo ""

# Target: all .tsx, .ts, .css files in src/
FILES=$(find src -type f \( -name '*.tsx' -o -name '*.ts' -o -name '*.css' \))

# ── DARK PALETTE → SHADCN SEMANTIC TOKENS ──────────────────

# Backgrounds
# dark-950 = page background (darkest)
# dark-900 = page background (slightly lighter)
# dark-850 = between bg and card
# dark-800 = card/surface
# dark-700 = elevated surface / subtle border bg
# dark-600 = hover state / elevated
# dark-500 = disabled / very muted

echo "  [1/7] bg-dark-* → bg-background / bg-card / bg-muted ..."
for f in $FILES; do
  sed -i '' \
    -e 's/bg-dark-950/bg-background/g' \
    -e 's/bg-dark-900/bg-background/g' \
    -e 's/bg-dark-850/bg-card/g' \
    -e 's/bg-dark-800/bg-card/g' \
    -e 's/bg-dark-700/bg-muted/g' \
    -e 's/bg-dark-600/bg-muted/g' \
    -e 's/bg-dark-500/bg-muted/g' \
    -e 's/bg-dark-50/bg-primary-foreground/g' \
    "$f"
done

# Text colors
# dark-50, dark-100 = primary text (lightest in dark mode)
# dark-200, dark-300 = slightly dimmed text
# dark-400 = secondary/muted text
# dark-500 = more muted text
# dark-600 = very muted
# dark-700 = extremely muted
# dark-950 = inverted text (dark on light)

echo "  [2/7] text-dark-* → text-foreground / text-muted-foreground ..."
for f in $FILES; do
  sed -i '' \
    -e 's/text-dark-50/text-foreground/g' \
    -e 's/text-dark-100/text-foreground/g' \
    -e 's/text-dark-200/text-foreground/g' \
    -e 's/text-dark-300/text-muted-foreground/g' \
    -e 's/text-dark-400/text-muted-foreground/g' \
    -e 's/text-dark-500/text-muted-foreground/g' \
    -e 's/text-dark-600/text-muted-foreground/g' \
    -e 's/text-dark-700/text-muted-foreground/g' \
    -e 's/text-dark-950/text-foreground/g' \
    "$f"
done

# Borders
# dark-700 = standard border
# dark-600 = hover/accent border
# dark-800 = subtle border
# dark-500 = prominent border
# dark-400 = very prominent

echo "  [3/7] border-dark-* → border-border ..."
for f in $FILES; do
  sed -i '' \
    -e 's/border-dark-700/border-border/g' \
    -e 's/border-dark-600/border-border/g' \
    -e 's/border-dark-800/border-border/g' \
    -e 's/border-dark-500/border-border/g' \
    -e 's/border-dark-400/border-border/g' \
    "$f"
done

# Ring & misc dark
echo "  [3.5/7] ring-dark-*, divide-dark-*, ring-offset-dark-* ..."
for f in $FILES; do
  sed -i '' \
    -e 's/ring-dark-[0-9]*/ring-ring/g' \
    -e 's/ring-offset-dark-[0-9]*/ring-offset-background/g' \
    -e 's/divide-dark-[0-9]*/divide-border/g' \
    "$f"
done

# ── ACCENT PALETTE → PRIMARY ───────────────────────────────

echo "  [4/7] accent-500/400/600 → primary ..."
for f in $FILES; do
  sed -i '' \
    -e 's/bg-accent-600/bg-primary\/90/g' \
    -e 's/bg-accent-500/bg-primary/g' \
    -e 's/bg-accent-400/bg-primary\/80/g' \
    -e 's/text-accent-600/text-primary/g' \
    -e 's/text-accent-500/text-primary/g' \
    -e 's/text-accent-400/text-primary/g' \
    -e 's/text-accent-300/text-primary\/70/g' \
    -e 's/border-accent-500/border-primary/g' \
    -e 's/border-accent-400/border-primary\/70/g' \
    -e 's/ring-accent-500/ring-ring/g' \
    -e 's/ring-accent-400/ring-ring\/70/g' \
    -e 's/ring-accent-300/ring-ring\/50/g' \
    -e 's/from-accent-500/from-primary/g' \
    -e 's/from-accent-400/from-primary\/80/g' \
    -e 's/to-accent-700/to-primary\/90/g' \
    -e 's/to-accent-600/to-primary\/80/g' \
    -e 's/shadow-accent-500/shadow-primary/g' \
    "$f"
done

# ── CHAMPAGNE (light theme specific) → REMOVE ──────────────
# shadcn tokens auto-switch, so champagne-specific classes are redundant.
# We map them to the same semantic tokens.

echo "  [5/7] champagne-* → shadcn equivalents ..."
for f in $FILES; do
  sed -i '' \
    -e 's/bg-champagne-200/bg-background/g' \
    -e 's/bg-champagne-100/bg-background/g' \
    -e 's/bg-champagne-50/bg-card/g' \
    -e 's/bg-champagne-300/bg-muted/g' \
    -e 's/bg-champagne-400/bg-muted/g' \
    -e 's/text-champagne-950/text-foreground/g' \
    -e 's/text-champagne-900/text-foreground/g' \
    -e 's/text-champagne-800/text-foreground/g' \
    -e 's/text-champagne-700/text-muted-foreground/g' \
    -e 's/text-champagne-600/text-muted-foreground/g' \
    -e 's/text-champagne-500/text-muted-foreground/g' \
    -e 's/text-champagne-400/text-muted-foreground/g' \
    -e 's/border-champagne-300/border-border/g' \
    -e 's/border-champagne-400/border-border/g' \
    -e 's/ring-offset-champagne-100/ring-offset-background/g' \
    -e 's/shadow-champagne-500/shadow-primary/g' \
    "$f"
done

# ── STATUS COLORS (keep as-is, they're fine) ────────────────
# success-*, warning-*, error-* are already semantic — no changes needed.

# ── FOCUS RING CLEANUP ──────────────────────────────────────

echo "  [6/7] focus ring patterns ..."
for f in $FILES; do
  sed -i '' \
    -e 's/focus-visible:ring-ring\/50/focus-visible:ring-ring\/50/g' \
    -e 's/focus:ring-accent-[0-9]*/focus:ring-ring/g' \
    -e 's/focus:border-accent-[0-9]*/focus:border-primary/g' \
    "$f"
done

# ── CSS VARIABLE REFERENCES ─────────────────────────────────
# var(--color-dark-*) and var(--color-champagne-*) in inline styles

echo "  [7/7] CSS variable references in inline styles ..."
for f in $FILES; do
  sed -i '' \
    -e 's/var(--color-dark-950)/var(--background)/g' \
    -e 's/var(--color-dark-900)/var(--background)/g' \
    -e 's/var(--color-dark-850)/var(--card)/g' \
    -e 's/var(--color-dark-800)/var(--card)/g' \
    -e 's/var(--color-dark-700)/var(--muted)/g' \
    -e 's/var(--color-dark-600)/var(--muted)/g' \
    -e 's/var(--color-dark-500)/var(--muted-foreground)/g' \
    -e 's/var(--color-dark-400)/var(--muted-foreground)/g' \
    -e 's/var(--color-dark-300)/var(--muted-foreground)/g' \
    -e 's/var(--color-dark-200)/var(--foreground)/g' \
    -e 's/var(--color-dark-100)/var(--foreground)/g' \
    -e 's/var(--color-dark-50)/var(--foreground)/g' \
    -e 's/var(--color-champagne-200)/var(--background)/g' \
    -e 's/var(--color-champagne-50)/var(--card)/g' \
    -e 's/var(--color-champagne-900)/var(--foreground)/g' \
    -e 's/var(--color-accent-500)/var(--primary)/g' \
    -e 's/var(--color-accent-400)/var(--primary)/g' \
    "$f"
done

echo ""
echo "✅ Done! Run 'npm run dev' and check visually."
echo ""
echo "Remaining manual work:"
echo "  - globals.css: clean up .light remapping block & champagne @utility rules"
echo "  - Components with opacity variants (e.g. bg-dark-800/60) may need tweaking"
echo "  - Inline style color-mix() references may need updating"
