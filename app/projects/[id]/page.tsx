"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { generateClient } from "aws-amplify/data";
import { getUrl } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";
import CategoryBadge from "@/app/components/CategoryBadge";
import Lightbox from "@/app/components/Lightbox";
import styles from "./page.module.css";

// NOTE: client is created inside the component (not at module scope) so it
// is instantiated after Amplify.configure() has run in AmplifyProvider.

type Project = Schema["Project"]["type"];
type Photo = Schema["Photo"]["type"];

interface PhotoWithUrl extends Photo {
  url: string | null;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientRef = useRef(generateClient<Schema>({ authMode: "apiKey" }));
  const client = clientRef.current;
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [{ data: proj }, { data: rawPhotos }] = await Promise.all([
          client.models.Project.get({ id }),
          client.models.Photo.list({ filter: { projectId: { eq: id } } }),
        ]);

        setProject(proj ?? null);

        if (rawPhotos && rawPhotos.length > 0) {
          const sorted = [...rawPhotos].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );

          const withUrls: PhotoWithUrl[] = await Promise.all(
            sorted.map(async (photo) => {
              try {
                const { url } = await getUrl({ path: photo.s3Key });
                return { ...photo, url: url.toString() };
              } catch {
                return { ...photo, url: null };
              }
            })
          );

          setPhotos(withUrls);
        }
      } catch {
        // handle gracefully
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const photoUrls = photos
    .map((p) => p.url)
    .filter((u): u is string => u !== null);

  const handlePrev = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : (i - 1 + photoUrls.length) % photoUrls.length
    );
  }, [photoUrls.length]);

  const handleNext = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : (i + 1) % photoUrls.length
    );
  }, [photoUrls.length]);

  const handleClose = useCallback(() => setLightboxIndex(null), []);

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loadingHeader} aria-label="Loading project…" />
          <div className={styles.photoGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeleton} aria-hidden="true" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.notFound}>Project not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Project header */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.customerName}>{project.customerName}</h1>
            <CategoryBadge
              category={
                project.category as Parameters<
                  typeof CategoryBadge
                >[0]["category"]
              }
            />
          </div>
          {project.address && (
            <p className={styles.address}>{project.address}</p>
          )}
          {project.description && (
            <p className={styles.description}>{project.description}</p>
          )}
          <p className={styles.photoCount}>
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </p>
        </header>

        {/* Photo grid */}
        {photos.length === 0 ? (
          <p className={styles.noPhotos}>No photos yet.</p>
        ) : (
          <div className={styles.photoGrid}>
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                className={styles.photoBtn}
                onClick={() => setLightboxIndex(idx)}
                aria-label={
                  photo.caption
                    ? `View photo: ${photo.caption}`
                    : `View photo ${idx + 1}`
                }
              >
                {photo.url ? (
                  <div className={styles.photoWrapper}>
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? `Photo ${idx + 1}`}
                      fill
                      sizes="(max-width: 767px) 50vw, 33vw"
                      className={styles.photo}
                    />
                  </div>
                ) : (
                  <div className={styles.photoPlaceholder} aria-hidden="true" />
                )}
                {photo.caption && (
                  <p className={styles.caption}>{photo.caption}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && photoUrls.length > 0 && (
        <Lightbox
          urls={photoUrls}
          currentIndex={lightboxIndex}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </main>
  );
}
