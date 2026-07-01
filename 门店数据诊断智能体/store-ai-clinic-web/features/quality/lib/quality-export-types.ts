export type QualityExportTaskResponse = {
  id: string;
  export_type: string;
  dataset_path: string;
  status: "queued" | "running" | "done" | "failed";
  message: string;
  created_at: string;
  bundle_name?: string | null;
  bundle_path?: string | null;
  download_url?: string | null;
  artifact_count?: number | null;
  export_dir?: string | null;
};
