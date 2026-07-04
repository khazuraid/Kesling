"use client";

interface PdfExportProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  filename?: string;
}

export function PdfExportButton({ title, headers, rows, filename = "laporan" }: PdfExportProps) {
  async function handleExport() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape" });

    // Header styling consistent with zinc design system
    doc.setFontSize(16);
    doc.setTextColor(9, 9, 11); // zinc-950
    doc.text(title, 14, 15);

    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 22);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 26,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [9, 9, 11], // zinc-950
      },
      headStyles: {
        fillColor: [9, 9, 11], // zinc-950 instead of teal
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [244, 244, 245], // zinc-100
      },
    });

    doc.save(`${filename}.pdf`);
  }

  return (
    <button
      onClick={handleExport}
      className="h-9 px-4 bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] transition-colors h-11 px-4 text-sm font-bold flex items-center gap-2"
    >
      📄 Export PDF
    </button>
  );
}
