"use client";

import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import styles from "./Lightbox.module.css";

interface LightboxProps {
  urls: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Lightbox({
  urls,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button when modal opens
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const total = urls.length;
  const src = urls[currentIndex];

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${currentIndex + 1} of ${total}`}
    >
      <div className={styles.toolbar}>
        <span className={styles.counter}>
          {currentIndex + 1} / {total}
        </span>
        <button
          ref={closeRef}
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close lightbox"
        >
          ✕
        </button>
      </div>

      <button
        className={`${styles.arrowBtn} ${styles.arrowLeft}`}
        onClick={onPrev}
        aria-label="Previous photo"
        disabled={total <= 1}
      >
        ‹
      </button>

      <div className={styles.imageWrapper}>
        {src && (
          <Image
            src={src}
            alt={`Photo ${currentIndex + 1}`}
            fill
            sizes="100vw"
            className={styles.image}
            priority
          />
        )}
      </div>

      <button
        className={`${styles.arrowBtn} ${styles.arrowRight}`}
        onClick={onNext}
        aria-label="Next photo"
        disabled={total <= 1}
      >
        ›
      </button>
    </div>
  );
}
