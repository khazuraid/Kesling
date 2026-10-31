"use client";

import { FileText, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { useCallback, useState } from "react";
import { type Accept, useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileDropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  hint?: string;
}

export function FileDropzone({
  onFilesSelected,
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    "application/pdf": [".pdf"],
  },
  maxFiles = 5,
  maxSizeMB = 10,
  disabled = false,
  className,
  label = "Tarik berkas ke sini atau klik untuk memilih",
  hint,
}: FileDropzoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: unknown[]) => {
      setError(null);
      if (fileRejections && fileRejections.length > 0) {
        setError(`Berkas tidak sesuai ketentuan (Maks ${maxSizeMB}MB).`);
        return;
      }
      setSelectedFiles(acceptedFiles);
      onFilesSelected?.(acceptedFiles);
    },
    [maxSizeMB, onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled,
  });

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected?.(updated);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-card transition-colors cursor-pointer text-center",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-surface-subtle",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        )}
      >
        <input {...getInputProps()} />
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <UploadCloud className="w-5 h-5" />
        </div>
        <p className="text-xs sm:text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {hint ?? `PNG, JPG, WEBP, atau PDF (Maks ${maxSizeMB}MB, maks ${maxFiles} berkas)`}
        </p>
      </div>

      {error && <p className="text-xs text-error font-medium">{error}</p>}

      {selectedFiles.length > 0 && (
        <ul className="space-y-2">
          {selectedFiles.map((file, idx) => {
            const isImage = file.type.startsWith("image/");
            return (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-button border border-border bg-surface text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {isImage ? (
                    <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate font-medium text-foreground">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-error"
                  onClick={() => removeFile(idx)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FileDropzone;
