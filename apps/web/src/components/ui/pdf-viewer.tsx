"use client";

import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PdfViewerProps {
  url: string;
  className?: string;
  title?: string;
}

export function PdfViewer({ url, className, title = "Dokumen PDF" }: PdfViewerProps) {
  const [isClient, setIsClient] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [PdfComponents, setPdfComponents] = useState<{
    Document: React.ComponentType<any>;
    Page: React.ComponentType<any>;
  } | null>(null);

  useEffect(() => {
    setIsClient(true);
    let isSubscribed = true;

    async function loadPdf() {
      try {
        const { Document, Page, pdfjs } = await import("react-pdf");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        if (isSubscribed) {
          setPdfComponents({ Document, Page });
        }
      } catch (err) {
        console.error("Failed to load PDF library:", err);
      }
    }

    loadPdf();

    return () => {
      isSubscribed = false;
    };
  }, []);

  if (!isClient || !PdfComponents) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-12 border border-border rounded-card bg-surface",
          className,
        )}
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
        <p className="text-xs text-muted-foreground font-medium">Memuat penampil PDF...</p>
      </div>
    );
  }

  const { Document, Page } = PdfComponents;

  return (
    <div className={cn("flex flex-col border border-border rounded-card bg-surface overflow-hidden", className)}>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-surface-subtle text-xs">
        <span className="font-semibold text-foreground truncate max-w-[200px]">{title}</span>

        <div className="flex items-center gap-2">
          {numPages && (
            <div className="flex items-center gap-1 text-muted-foreground mr-2 font-medium">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span>
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <a
            href={url}
            download
            className="inline-flex items-center justify-center h-7 px-2.5 rounded-button bg-primary text-white hover:bg-primary-hover font-semibold transition"
          >
            <Download className="w-3 h-3 mr-1" />
            <span>Unduh</span>
          </a>
        </div>
      </div>

      {/* PDF Canvas View */}
      <div className="flex justify-center p-4 bg-muted/40 overflow-auto max-h-[600px]">
        <Document
          file={url}
          onLoadSuccess={({ numPages: loadedPages }: { numPages: number }) => {
            setNumPages(loadedPages);
            setPageNumber(1);
          }}
          loading={
            <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Memproses dokumen...</span>
            </div>
          }
          error={
            <div className="py-8 text-xs text-error font-medium">Gagal memuat dokumen PDF. Pastikan URL valid.</div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-md rounded-sm overflow-hidden"
          />
        </Document>
      </div>
    </div>
  );
}

export default PdfViewer;
