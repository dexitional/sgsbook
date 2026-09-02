import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "#/components/ui/label";
import { IconButton } from "@sgs/ui";
import { api } from "#/lib/api-client";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
}: {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  folder: "facilities" | "clients";
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Images must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await api.post<PresignResponse>("/uploads/presign", {
        filename: file.name,
        contentType: file.type,
        folder,
      });

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      onChange(publicUrl);
    } catch {
      toast.error("Couldn't upload image — please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-secondary disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && !uploading && (
            <IconButton aria-label="Remove image" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <X className="size-3.5" />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}
