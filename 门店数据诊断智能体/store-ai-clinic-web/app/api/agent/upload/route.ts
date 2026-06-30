import { NextResponse } from "next/server";

type UploadedFileSummary = {
  field_name: string;
  name: string;
  size: number;
  type: string;
  last_modified: number;
};

type UploadSummaryResponse = {
  data_source: "mock";
  persisted: false;
  total_bytes: number;
  total_files: number;
  files: UploadedFileSummary[];
  note: string;
};

function buildUploadHeaders() {
  return {
    "X-Agent-Upload-Data-Source": "mock",
    "X-Agent-Upload-Persistence": "none",
  };
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { detail: "Expected multipart/form-data with one or more files." },
      {
        status: 400,
        headers: buildUploadHeaders(),
      },
    );
  }

  const files = Array.from(formData.entries())
    .filter((entry): entry is [string, File] => entry[1] instanceof File)
    .map(([fieldName, file]) => ({
      field_name: fieldName,
      last_modified: file.lastModified,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

  if (files.length === 0) {
    return NextResponse.json(
      { detail: "Attach at least one file in the multipart form data." },
      {
        status: 400,
        headers: buildUploadHeaders(),
      },
    );
  }

  const response: UploadSummaryResponse = {
    data_source: "mock",
    persisted: false,
    total_bytes: files.reduce((total, file) => total + file.size, 0),
    total_files: files.length,
    files,
    note: "Files are summarized in the BFF only until upload persistence is wired to the backend.",
  };

  return NextResponse.json(response, {
    status: 200,
    headers: buildUploadHeaders(),
  });
}
