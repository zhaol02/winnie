"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import ProjectCard from "@/app/components/ProjectCard";
import styles from "./page.module.css";

const client = generateClient<Schema>();

type Project = Schema["Project"]["type"];

type CategoryFilter =
  | "ALL"
  | "BATHROOM"
  | "KITCHEN"
  | "LIVING_ROOM"
  | "BEDROOM"
  | "EXTERIOR"
  | "OTHER";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  ALL: "All",
  BATHROOM: "Bathroom",
  KITCHEN: "Kitchen",
  LIVING_ROOM: "Living Room",
  BEDROOM: "Bedroom",
  EXTERIOR: "Exterior",
  OTHER: "Other",
};

const FILTER_OPTIONS: CategoryFilter[] = [
  "ALL",
  "BATHROOM",
  "KITCHEN",
  "LIVING_ROOM",
  "BEDROOM",
  "EXTERIOR",
  "OTHER",
];

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("ALL");

  useEffect(() => {
    const sub = client.models.Project.observeQuery().subscribe({
      next: ({ items }) => {
        setProjects(items);
        setLoading(false);
      },
      error: () => {
        setLoading(false);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  const filtered =
    activeFilter === "ALL"
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroHeadline}>
            Transforming Spaces,<br />One Room at a Time
          </h1>
          <p className={styles.heroSub}>
            Browse our completed remodeling projects — bathrooms, kitchens,
            bedrooms, and more.
          </p>
          <a href="#projects" className={styles.heroCta}>
            View Our Work
          </a>
        </div>
      </section>

      {/* Projects section */}
      <section id="projects" className={styles.projectsSection}>
        <div className={styles.container}>
          {/* Category filter */}
          <div className={styles.filterBar} role="group" aria-label="Filter by category">
            {FILTER_OPTIONS.map((cat) => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${activeFilter === cat ? styles.filterBtnActive : ""}`}
                onClick={() => setActiveFilter(cat)}
                aria-pressed={activeFilter === cat}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeleton} aria-hidden="true" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>No projects yet.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
