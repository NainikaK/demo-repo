import { useState, useRef, useCallback } from 'react';

const DISPLAY_DURATION_MS = 1000;
const FADE_DURATION_MS = 300;

interface UseTaskAddedToastResult {
  visible: boolean;
  fading: boolean;
  triggerToast: () => void;
}

export function useTaskAddedToast(): UseTaskAddedToastResult {
  const [visible, setVisible] = useState<boolean>(false);
  const [fading, setFading] = useState<boolean>(false);
  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerToast = useCallback(() => {
    if (displayTimerRef.current !== null) {
      clearTimeout(displayTimerRef.current);
    }
    if (fadeTimerRef.current !== null) {
      clearTimeout(fadeTimerRef.current);
    }

    setFading(false);
    setVisible(true);

    displayTimerRef.current = setTimeout(() => {
      setFading(true);

      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, FADE_DURATION_MS);
    }, DISPLAY_DURATION_MS);
  }, []);

  return { visible, fading, triggerToast };
}
