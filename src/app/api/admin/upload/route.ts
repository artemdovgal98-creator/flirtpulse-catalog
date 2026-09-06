import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminGuard } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_FILES = 3;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per image
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

/**
 * Uploads up to 3 showcase images (max 10 MB each) and returns their file ids
 * together with a preview URL so the admin form can show them immediately.
 */
export async function POST(request: Request) {
  try {
    const { isAdmin } = await getAdminGuard();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "No files received" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `Maximum ${MAX_FILES} images per showcase` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { ok: false, error: `"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB — the limit is 10 MB` },
          { status: 400 }
        );
      }
      if (file.type && !ALLOWED.includes(file.type)) {
        return NextResponse.json(
          { ok: false, error: `"${file.name}" is not a supported image format` },
          { status: 400 }
        );
      }
    }

    const uploaded: Array<{ name: string; url: string }> = [];

    for (const file of files) {
      // NOTE: the global FormData is required here — never import the `form-data` package.
      const payload = new FormData();
      payload.append("file", file, file.name || `showcase-${Date.now()}.jpg`);

      const result = await totalumSdk.files.uploadFile(payload);
      if (result.errors) console.error("[API /admin/upload] sdk errors:", result.errors);

      const fileNameId = result.data as unknown as string;
      if (!fileNameId) throw new Error(`Upload failed for "${file.name}"`);

      const urlResult = await totalumSdk.files.getDownloadUrl(fileNameId);
      const url = Array.isArray(urlResult.data) ? urlResult.data[0] : (urlResult.data as any);

      uploaded.push({ name: fileNameId, url: String(url || "") });
      console.log(`[API /admin/upload] stored ${file.name} (${(file.size / 1024).toFixed(0)} KB) as ${fileNameId}`);
    }

    return NextResponse.json({ ok: true, data: { files: uploaded } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/upload", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
