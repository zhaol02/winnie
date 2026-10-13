"use client";

import { useEffect, useState } from "react";
import styles from "./UploadProgressItem.module.css";

export type UploadStatus = "pending" | "uploading" | "done" | "error";

interface UploadProgressItemProps {
  file: File;
  progress: number;
  status: UploadStatus;
  errorMessage?: string;
}

const HEIC_EXTENSIONS = ["heic", "heif"];

function isHeic(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return HEIC_EXTENSIONS.includes(ext) || file.type === "image/heic" || file.type === "image/heif";
}

export default function UploadProgressItem({
  file,
  progress,
  status,
  errorMessage,
}: UploadProgressItemProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // HEIC files may not render in browsers — show a placeholder instead
    if (isHeic(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const barClass =
    status === "done"
      ? `${styles.progressBar} ${styles.progressBarDone}`
      : status === "error"
      ? `${styles.progressBar} ${styles.progressBarError}`
      : styles.progressBar;

  const statusClass =
    status === "done"
      ? `${styles.statusText} ${styles.done}`
      : status === "error"
      ? `${styles.statusText} ${styles.error}`
      : styles.statusText;

  const statusLabel =
    status === "pending"
      ? "Waiting…"
      : status === "uploading"
      ? `${progress}%`
      : status === "done"
      ? "Uploaded"
      : errorMessage ?? "Upload failed";

  return (
    <div className={styles.item}>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          className={styles.thumbnail}
        />
      ) : (
        <div
          className={styles.thumbnailPlaceholder}
          aria-label={`Image file: ${file.name}`}
          role="img"
        >
          🖼️
        </div>
      )}

      <div className={styles.info}>
        <p className={styles.filename}>{file.name}</p>
        <div className={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={barClass} style={{ width: `${progress}%` }} />
        </div>
        <p className={statusClass}>{statusLabel}</p>
      </div>

      <div className={styles.icon} aria-hidden="true">
        {status === "uploading" && <div className={styles.spinner} />}
        {status === "done" && "✅"}
        {status === "error" && "❌"}
      </div>
    </div>
  );
}
