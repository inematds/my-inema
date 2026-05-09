"use client";

import { useState } from "react";
import jsPDF from "jspdf";

type Scene = {
  id: string;
  name: string | null;
  epithet: string | null;
  image_data: string | null;
  position: number;
};

// Renders the published book to a PDF entirely in the browser.
// One page per scene: image (square) on top, name+epithet below.
// Cover page comes first.
export function DownloadBookButton({
  title,
  scenes,
}: {
  title: string;
  scenes: Scene[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    setBusy(true);
    setError(null);
    try {
      const doc = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Cover.
      doc.setFillColor(246, 239, 226);
      doc.rect(0, 0, pageW, pageH, "F");
      doc.setTextColor(29, 25, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      const wrapped = doc.splitTextToSize(title || "Sem título", pageW - 40);
      doc.text(wrapped, pageW / 2, pageH / 2 - 10, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(132, 122, 106);
      doc.text("Andaime Junior", pageW / 2, pageH - 18, { align: "center" });

      const ordered = [...scenes].sort((a, b) => a.position - b.position);
      for (const s of ordered) {
        doc.addPage();
        doc.setFillColor(246, 239, 226);
        doc.rect(0, 0, pageW, pageH, "F");

        if (s.image_data) {
          const w = pageW - 40;
          const x = 20;
          const y = 25;
          // base64 PNG
          doc.addImage(
            `data:image/png;base64,${s.image_data}`,
            "PNG",
            x,
            y,
            w,
            w, // square
            undefined,
            "MEDIUM",
          );
        }

        if (s.name) {
          doc.setTextColor(29, 25, 22);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          const lines = doc.splitTextToSize(s.name, pageW - 40);
          doc.text(lines, pageW / 2, pageH - 38, { align: "center" });
        }
        if (s.epithet) {
          doc.setTextColor(14, 84, 76);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(11);
          const lines = doc.splitTextToSize(s.epithet, pageW - 50);
          doc.text(lines, pageW / 2, pageH - 24, { align: "center" });
        }
      }

      const safeName = (title || "livro")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) || "livro";
      doc.save(`${safeName}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (scenes.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={build}
        disabled={busy}
        className="body-serif text-[0.92rem] tracking-[0.02em] px-5 py-2 rounded-full transition-all hover:translate-y-[-1px] disabled:opacity-50"
        style={{
          background: "transparent",
          border: "1px solid var(--paper-edge)",
          color: "var(--ink-soft)",
        }}
      >
        {busy ? "montando PDF..." : "baixar livro em PDF"}
      </button>
      {error && (
        <p className="body-serif italic text-[0.82rem] text-[var(--crimson)]">
          {error}
        </p>
      )}
    </div>
  );
}
