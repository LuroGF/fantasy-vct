"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useSwipeable } from 'react-swipeable';
import { haptic } from '@/lib/utils/haptics';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SwipeNavigationProps {
  children: React.ReactNode;
}

// Define navigation order (left to right swipe flow)
const NAV_ORDER = [
  '/dashboard',
  '/team',
  '/stats',
  '/market',
  '/leagues',
  '/more'
];

export default function SwipeNavigation({ children }: SwipeNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('left');

  const currentIndex = NAV_ORDER.indexOf(pathname);

  const navigateToPage = (swipeDirection: 'left' | 'right') => {
    if (isTransitioning) return; // Prevent multiple swipes

    let targetIndex = currentIndex;
    
    if (swipeDirection === 'left' && currentIndex < NAV_ORDER.length - 1) {
      targetIndex = currentIndex + 1;
      setDirection('left');
    } else if (swipeDirection === 'right' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
      setDirection('right');
    } else {
      // At boundary, give error feedback
      haptic.light();
      return;
    }

    // Haptic feedback for successful swipe
    haptic.medium();
    setIsTransitioning(true);

    // Navigate
    router.push(NAV_ORDER[targetIndex]);

    // Reset transition lock after animation
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => navigateToPage('left'),
    onSwipedRight: () => navigateToPage('right'),
    trackMouse: false, // Only track touch, not mouse (desktop)
    trackTouch: true,
    delta: 50, // Minimum swipe distance (px)
    preventScrollOnSwipe: false, // Allow vertical scroll
    swipeDuration: 500, // Max swipe duration (ms)
  });

  // Animation variants
  const variants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <div {...handlers} className="h-full w-full overflow-hidden flex flex-col">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="flex-1 flex flex-col h-full w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
