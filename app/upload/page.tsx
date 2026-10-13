"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import { uploadData } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";
import UploadProgressItem, { UploadStatus } from "@/app/components/UploadProgressItem";
import styles from "./page.module.css";

// NOTE: client is intentionally created inside UploadForm (not at module scope)
// so that it is created after Amplify.configure() has run in AmplifyProvider.

type CategoryValue =
  | "BATHROOM"
  | "KITCHEN"
  | "LIVING_ROOM"
  | "BEDROOM"
  | "EXTERIOR"
  | "OTHER";

const CATEGORIES: { value: CategoryValue; label: string }[] = [
  { value: "BATHROOM", label: "Bathroom" },
  { value: "KITCHEN", label: "Kitchen" },
  { value: "LIVING_ROOM", label: "Living Room" },
  { value: "BEDROOM", label: "Bedroom" },
  { value: "EXTERIOR", label: "Exterior" },
  { value: "OTHER", label: "Other" },
];

interface FileState {
  file: File;
  progress: number;
  status: UploadStatus;
  errorMessage?: string;
}

type Project = Schema["Project"]["type"];

function UploadForm() {
  const searchParams = useSearchParams();
  const prefilledProjectId = searchParams.get("projectId");

  // Create client inside the component so it is instantiated after
  // Amplify.configure() has run — module-scope clients have no auth tokens.
  // useRef keeps it stable across re-renders without recreating on every render.
  const clientRef = useRef(generateClient<Schema>({ authMode: "userPool" }));
  const client = clientRef.current;

  const [mode, setMode] = useState<"existing" | "new">(
    prefilledProjectId ? "existing" : "new"
  );

  // Existing project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    prefilledProjectId ?? ""
  );
  const [projectsLoading, setProjectsLoading] = useState(false);

  // New project fields
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<CategoryValue>("BATHROOM");
  const [description, setDescription] = useState("");

  // Files
  const [files, setFiles] = useState<FileState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Overall state
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  // Load existing projects
  useEffect(() => {
    setProjectsLoading(true);
    client.models.Project.list()
      .then(({ data }) => {
        setProjects(data ?? []);
        // If a projectId was pre-filled from the URL, switch to existing mode
        if (prefilledProjectId) {
          setSelectedProjectId(prefilledProjectId);
          setMode("existing");
        }
      })
      .catch(() => {
        // Unable to load projects — user can still create a new one
      })
      .finally(() => setProjectsLoading(false));
  }, [prefilledProjectId]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (!selected.length) return;
      setFiles(
        selected.map((f) => ({
          file: f,
          progress: 0,
          status: "pending",
        }))
      );
      setSuccessMessage("");
      setFormError("");
    },
    []
  );

  const handleUpload = useCallback(async () => {
    setFormError("");
    setSuccessMessage("");

    if (files.length === 0) {
      setFormError("Please select at least one photo.");
      return;
    }

    if (mode === "new" && !customerName.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    if (mode === "existing" && !selectedProjectId) {
      setFormError("Please select a project.");
      return;
    }

    setUploading(true);

    try {
      let projectId = selectedProjectId;

      if (mode === "new") {
        let newProject: Awaited<ReturnType<typeof client.models.Project.create>>["data"] | undefined;
        let errors: Awaited<ReturnType<typeof client.models.Project.create>>["errors"] | undefined;
        try {
          const result = await client.models.Project.create({
            customerName: customerName.trim(),
            address: address.trim() || undefined,
            category,
            description: description.trim() || undefined,
          });
          console.log("[Upload] Project.create result:", JSON.stringify(result));
          newProject = result.data ?? undefined;
          errors = result.errors;
        } catch (err) {
          console.error("[Upload] Project.create threw:", err);
          const msg = err instanceof Error ? err.message : String(err);
          setFormError(`Failed to create project: ${msg}`);
          setFiles((prev) => prev.map((f) => ({ ...f, status: "error" as UploadStatus, errorMessage: msg })));
          setUploading(false);
          return;
        }

        if (errors?.length || !newProject) {
          const msg = errors?.map((e: { message: string }) => e.message).join(", ") ?? "Unknown error";
          console.error("[Upload] Project.create failed — errors:", errors, "newProject:", newProject);
          setFormError(`Failed to create project: ${msg}`);
          setFiles((prev) => prev.map((f) => ({ ...f, status: "error" as UploadStatus, errorMessage: msg })));
          setUploading(false);
          return;
        }
        projectId = newProject.id;
        console.log("[Upload] Project created, id:", projectId);
      }

      // Guard: never upload without a valid project
      if (!projectId) {
        console.error("[Upload] No projectId after project create/select");
        setFormError("No project selected or created. Please try again.");
        setUploading(false);
        return;
      }

      // Upload each file
      const updatedFiles = [...files];
      for (let i = 0; i < files.length; i++) {
        const { file } = files[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const uuid = crypto.randomUUID();
        const s3Path = `photos/${projectId}/${uuid}.${ext}`;

        updatedFiles[i] = { ...updatedFiles[i], status: "uploading", progress: 0 };
        setFiles([...updatedFiles]);

        try {
          // Step 1: upload to S3
          await uploadData({
            path: s3Path,
            data: file,
            options: {
              onProgress: ({ transferredBytes, totalBytes }) => {
                const pct =
                  totalBytes && totalBytes > 0
                    ? Math.round((transferredBytes / totalBytes) * 100)
                    : 0;
                updatedFiles[i] = {
                  ...updatedFiles[i],
                  progress: pct,
                  status: "uploading",
                };
                setFiles([...updatedFiles]);
              },
            },
          }).result;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "S3 upload failed";
          updatedFiles[i] = { ...updatedFiles[i], status: "error", errorMessage: `S3 error: ${msg}` };
          setFiles([...updatedFiles]);
          continue;
        }

        // Step 2: save Photo record in DynamoDB
        try {
          console.log("[Upload] Creating Photo record for", file.name, "projectId:", projectId);
          const { errors: photoErrors } = await client.models.Photo.create({
            projectId,
            s3Key: s3Path,
            order: i,
          });
          if (photoErrors?.length) {
            throw new Error(photoErrors.map((e: { message: string }) => e.message).join(", "));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to save photo record";
          updatedFiles[i] = { ...updatedFiles[i], status: "error", errorMessage: `DB error: ${msg}` };
          setFiles([...updatedFiles]);
          continue;
        }

        // Step 3: increment photoCount (non-critical, best effort)
        try {
          const { data: proj } = await client.models.Project.get({ id: projectId });
          if (proj) {
            await client.models.Project.update({
              id: projectId,
              photoCount: (proj.photoCount ?? 0) + 1,
            });
          }
        } catch {
          // Non-critical — photo is saved; counter may be off
        }

        updatedFiles[i] = { ...updatedFiles[i], progress: 100, status: "done" };
        setFiles([...updatedFiles]);
      }

      const allDone = updatedFiles.every((f) => f.status === "done");
      if (allDone) {
        setSuccessMessage(
          `${files.length} photo${files.length > 1 ? "s" : ""} uploaded successfully!`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(`Upload error: ${msg}`);
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "pending" ? { ...f, status: "error" as UploadStatus, errorMessage: msg } : f
        )
      );
    } finally {
      setUploading(false);
    }
  }, [
    files,
    mode,
    customerName,
    address,
    category,
    description,
    selectedProjectId,
  ]);

  const isReady =
    !uploading &&
    files.length > 0 &&
    (mode === "new" ? customerName.trim() !== "" : selectedProjectId !== "");

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Upload Photos</h1>

        {successMessage && (
          <div className={styles.successBanner} role="status">
            {successMessage}
          </div>
        )}

        {formError && (
          <div className={styles.errorBanner} role="alert">
            {formError}
          </div>
        )}

        {/* Project mode toggle */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Project</p>
          <div className={styles.projectToggle}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === "existing" ? styles.active : ""}`}
              onClick={() => setMode("existing")}
            >
              Existing Project
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === "new" ? styles.active : ""}`}
              onClick={() => setMode("new")}
            >
              New Project
            </button>
          </div>

          {mode === "existing" ? (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="select-project">
                Select Project <span className={styles.required}>*</span>
              </label>
              <select
                id="select-project"
                className={styles.select}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={projectsLoading}
              >
                <option value="">
                  {projectsLoading ? "Loading projects…" : "Choose a project…"}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.customerName}
                    {p.address ? ` — ${p.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="customer-name">
                  Customer Name <span className={styles.required}>*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  className={styles.input}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John's House"
                  autoComplete="off"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="address">
                  Address
                </label>
                <input
                  id="address"
                  type="text"
                  className={styles.input}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Main St, Springfield"
                  autoComplete="off"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="category">
                  Category <span className={styles.required}>*</span>
                </label>
                <select
                  id="category"
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryValue)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the remodeling work…"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {/* File picker */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Photos</p>
          <label className={styles.fileLabel}>
            <span className={styles.fileIcon} aria-hidden="true">📸</span>
            <span className={styles.fileLabelText}>
              Tap to select photos
            </span>
            <span className={styles.fileLabelSub}>
              JPEG, PNG, HEIC supported · multiple files OK
            </span>
            <input
              ref={fileInputRef}
              type="file"
              className={styles.fileInput}
              accept="image/jpeg,image/png,image/heic,image/heif"
              multiple
              onChange={handleFileChange}
            />
          </label>

          {/* Per-file progress */}
          {files.length > 0 && (
            <div className={styles.progressList}>
              {files.map(({ file, progress, status, errorMessage }, idx) => (
                <UploadProgressItem
                  key={`${file.name}-${idx}`}
                  file={file}
                  progress={progress}
                  status={status}
                  errorMessage={errorMessage}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky upload button */}
      <div className={styles.stickyFooter}>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={handleUpload}
          disabled={!isReady}
          aria-disabled={!isReady}
        >
          {uploading ? "Uploading…" : `Upload ${files.length > 0 ? `${files.length} Photo${files.length > 1 ? "s" : ""}` : "Photos"}`}
        </button>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Authenticator>
      {() => (
        <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
          <UploadForm />
        </Suspense>
      )}
    </Authenticator>
  );
}
