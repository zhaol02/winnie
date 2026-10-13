"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Authenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import CategoryBadge from "@/app/components/CategoryBadge";
import styles from "./page.module.css";

// NOTE: client is created inside AdminDashboard (not at module scope) so it
// is instantiated after Amplify.configure() has run in AmplifyProvider.

type Project = Schema["Project"]["type"];
type CategoryValue = Parameters<typeof CategoryBadge>[0]["category"];

interface ProjectRow {
  project: Project;
  photoCount: number;
}

function AdminDashboard() {
  const clientRef = useRef(generateClient<Schema>({ authMode: "userPool" }));
  const client = clientRef.current;

  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: projects } = await client.models.Project.list();
      if (!projects) {
        setRows([]);
        return;
      }

      // Use the denormalized photoCount field set by the upload page to avoid
      // O(n) Photo.list queries. Falls back to 0 if the field is unset
      // (e.g. projects created before this field was added).
      const projectRows: ProjectRow[] = projects.map((project) => ({
        project,
        photoCount: project.photoCount ?? 0,
      }));

      setRows(projectRows);
    } catch {
      setError("Failed to load projects. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDelete = useCallback(
    async (row: ProjectRow) => {
      const confirmed = window.confirm(
        `Delete "${row.project.customerName}" and all ${row.photoCount} photo${row.photoCount !== 1 ? "s" : ""}?\n\nThis cannot be undone.`
      );
      if (!confirmed) return;

      setDeletingId(row.project.id);
      try {
        // List and delete all Photo records for this project
        const { data: photos } = await client.models.Photo.list({
          filter: { projectId: { eq: row.project.id } },
        });

        if (photos && photos.length > 0) {
          // Note: S3 objects are intentionally NOT deleted here (v1 behaviour).
          // Only the DynamoDB Photo records are removed. S3 cleanup can be
          // added in a future version via a Lambda or S3 lifecycle rule.
          await Promise.all(
            photos.map((photo) =>
              client.models.Photo.delete({ id: photo.id })
            )
          );
        }

        await client.models.Project.delete({ id: row.project.id });

        // Refresh the list
        setRows((prev) => prev.filter((r) => r.project.id !== row.project.id));
      } catch {
        setError(
          `Failed to delete "${row.project.customerName}". Please try again.`
        );
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner} aria-hidden="true" />
            Loading projects…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Admin Dashboard{" "}
            <span className={styles.count}>
              {rows.length} project{rows.length !== 1 ? "s" : ""}
            </span>
          </h1>
          <Link href="/upload" className={`${styles.actionBtn} ${styles.addPhotosBtn}`}>
            + New Upload
          </Link>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon} aria-hidden="true">📂</p>
            <p className={styles.emptyText}>No projects yet.</p>
            <Link href="/upload" className={styles.addLink}>
              Upload your first project
            </Link>
          </div>
        ) : (
          <ul className={styles.projectList} role="list">
            {rows.map((row) => (
              <li key={row.project.id} className={styles.projectCard}>
                <div className={styles.projectInfo}>
                  <p className={styles.projectName}>{row.project.customerName}</p>
                  <div className={styles.projectMeta}>
                    <CategoryBadge
                      category={row.project.category as CategoryValue}
                    />
                    {row.project.address && (
                      <span>{row.project.address}</span>
                    )}
                    <span className={styles.photoCount}>
                      {row.photoCount} photo{row.photoCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Link
                    href={`/upload?projectId=${row.project.id}`}
                    className={`${styles.actionBtn} ${styles.addPhotosBtn}`}
                  >
                    Add Photos
                  </Link>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => handleDelete(row)}
                    disabled={deletingId === row.project.id}
                    aria-label={`Delete project ${row.project.customerName}`}
                  >
                    {deletingId === row.project.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Authenticator>
      {() => <AdminDashboard />}
    </Authenticator>
  );
}
