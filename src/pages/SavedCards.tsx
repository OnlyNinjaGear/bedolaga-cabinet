import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { useToast } from '../components/Toast';
import { useDestructiveConfirm } from '../platform/hooks/useNativeDialog';

import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { Button as ShadcnButton } from '@/components/ui/button';
import { BackIcon } from '@/components/icons';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';

function formatCardDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function SavedCards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirmDelete = useDestructiveConfirm();

  const {
    data: savedCardsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: balanceApi.getSavedCards,
  });
  const savedCards = savedCardsData?.cards;

  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);

  const handleDeleteCard = async (cardId: number) => {
    if (deletingCardId !== null) return;
    const confirmed = await confirmDelete(
      t('balance.savedCards.confirmUnlink'),
      t('balance.savedCards.unlink'),
    );
    if (!confirmed) return;
    setDeletingCardId(cardId);
    try {
      await balanceApi.deleteSavedCard(cardId);
      await queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
      showToast({
        type: 'success',
        title: t('balance.savedCards.unlinkSuccess'),
        message: '',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to unlink card:', error);
      showToast({
        type: 'error',
        title: t('balance.savedCards.unlinkError'),
        message: '',
        duration: 3000,
      });
    } finally {
      setDeletingCardId(null);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center gap-3">
        <ShadcnButton onClick={() => navigate('/balance')} variant="outline" size="icon">
          <BackIcon className="h-5 w-5" />
        </ShadcnButton>
        <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
          {t('balance.savedCards.pageTitle')}
        </h1>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-linear border-border/30 bg-card/30 flex items-center justify-between border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted h-6 w-6 animate-pulse rounded" />
                    <div className="space-y-2">
                      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                      <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="bg-muted h-8 w-20 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Error state */}
      {isError && (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="py-12 text-center">
              <div className="text-error-400">{t('balance.savedCards.loadError')}</div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Cards List */}
      {!isLoading && !isError && savedCards && savedCards.length > 0 ? (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="space-y-3">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-linear border-border/30 bg-card/30 flex items-center justify-between border p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💳</span>
                    <div>
                      <div className="text-foreground font-medium">
                        {card.title ||
                          `${card.card_type || t('balance.savedCards.card')} ${card.card_last4 ? `*${card.card_last4}` : ''}`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {t('balance.savedCards.linkedAt', {
                          date: formatCardDate(card.created_at),
                        })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id)}
                    loading={deletingCardId === card.id}
                    className="text-error-400 hover:text-error-300"
                  >
                    {t('balance.savedCards.unlink')}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      ) : !isLoading && !isError && savedCards ? (
        /* Empty state - only show when data loaded and empty */
        <motion.div variants={staggerItem}>
          <Card>
            <div className="py-12 text-center">
              <div className="rounded-linear-lg bg-card mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <span className="text-3xl">💳</span>
              </div>
              <div className="text-muted-foreground">{t('balance.savedCards.empty')}</div>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
