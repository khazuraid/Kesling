"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";

interface PdfExportProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  filename?: string;
}

export function PdfExportButton({ title, headers, rows, filename = "laporan" }: PdfExportProps) {
  function handleExport() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(8);
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 22);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 26,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [13, 148, 136] },
    });

    doc.save(`${filename}.pdf`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      📄 PDF
    </Button>
  );
}
