import { useEffect, useMemo, useState } from 'react';
import { getSetting, setSetting } from '../../services/storage/indexedDbStore';

type UsePlaybackOptions = {
  totalSteps: number;
  initialSpeed: number;
};

type UsePlaybackResult = {
  currentStep: number;
  isPlaying: boolean;
  speed: number;
  prev: () => void;
  next: () => void;
  seek: (step: number) => void;
  reset: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
};

const SPEED_KEY = 'playback-speed';

export function usePlayback(options: UsePlaybackOptions): UsePlaybackResult {
  const { totalSteps, initialSpeed } = options;
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(initialSpeed);

  useEffect(() => {
    void getSetting<number>(SPEED_KEY, initialSpeed).then((saved) => {
      setSpeedState(saved);
    });
  }, [initialSpeed]);

  useEffect(() => {
    if (!isPlaying || totalSteps <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / Math.max(speed, 0.25));
    return () => window.clearInterval(timer);
  }, [isPlaying, speed, totalSteps]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentStep((prev) => Math.max(0, prev - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
      } else if (event.key === ' ') {
        event.preventDefault();
        setPlaying((prev) => !prev);
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        setPlaying(false);
        setCurrentStep(0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [totalSteps]);

  const api = useMemo<UsePlaybackResult>(
    () => ({
      currentStep,
      isPlaying,
      speed,
      prev: () => setCurrentStep((prev) => Math.max(0, prev - 1)),
      next: () => setCurrentStep((prev) => Math.min(Math.max(totalSteps - 1, 0), prev + 1)),
      seek: (step) => setCurrentStep(Math.min(Math.max(step, 0), Math.max(totalSteps - 1, 0))),
      reset: () => {
        setPlaying(false);
        setCurrentStep(0);
      },
      togglePlay: () => setPlaying((prev) => !prev),
      setSpeed: (nextSpeed) => {
        setSpeedState(nextSpeed);
        void setSetting<number>(SPEED_KEY, nextSpeed);
      }
    }),
    [currentStep, isPlaying, speed, totalSteps]
  );

  return api;
}
