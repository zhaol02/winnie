"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import { getUrl } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";
import CategoryBadge from "./CategoryBadge";
import styles from "./ProjectCard.module.css";

// NOTE: client is created inside the component (not at module scope) so it
// is instantiated after Amplify.configure() has run in AmplifyProvider.

type Project = Schema["Project"]["type"];

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const clientRef = useRef(generateClient<Schema>({ authMode: "apiKey" }));
  const client = clientRef.current;
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCover() {
      try {
        const { data: photos } = await client.models.Photo.list({
          filter: { projectId: { eq: project.id } },
        });

        if (!photos || photos.length === 0) return;

        // Pick the photo with the lowest order value (cover photo)
        const sorted = [...photos].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        const cover = sorted[0];

        const { url } = await getUrl({ path: cover.s3Key });
        if (!cancelled) {
          setCoverUrl(url.toString());
        }
      } catch {
        // No cover available; render placeholder
      }
    }

    loadCover();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  function handleClick() {
    router.push(`/projects/${project.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <article
      className={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View project: ${project.customerName}`}
    >
      <div className={styles.imageWrapper}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`Cover photo for ${project.customerName}`}
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
        <div className={styles.badgeOverlay}>
          <CategoryBadge category={project.category as Parameters<typeof CategoryBadge>[0]["category"]} />
        </div>
      </div>
      <div className={styles.info}>
        <p className={styles.name}>{project.customerName}</p>
        {project.address && (
          <p className={styles.address}>{project.address}</p>
        )}
      </div>
    </article>
  );
}
