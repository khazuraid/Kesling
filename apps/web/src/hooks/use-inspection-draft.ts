"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteInspectionDraft, getInspectionDraft, type InspectionDraft, saveInspectionDraft } from "@/lib/offline-db";

interface UseInspectionDraftOptions {
  templateId?: number | null;
  sasaranId?: number | null;
  formValues: Record<string | number, any>;
  metaValues: Record<string | number, any>;
  lat?: number | null;
  lng?: number | null;
  enabled?: boolean;
}

export function useInspectionDraft({
  templateId,
  sasaranId,
  formValues,
  metaValues,
  lat = null,
  lng = null,
  enabled = true,
}: UseInspectionDraftOptions) {
  const [draft, setDraft] = useState<InspectionDraft | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const draftKey = `draft_${templateId}_${sasaranId ?? "new"}`;

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled || !templateId) return;

    let isMounted = true;
    getInspectionDraft(draftKey).then((saved) => {
      if (isMounted && saved) {
        setDraft(saved);
        setHasDraft(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [draftKey, templateId, enabled]);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled || !templateId) return;

    // Only save if there's actual data
    const hasFormData = Object.keys(formValues).length > 0 || Object.keys(metaValues).length > 0;
    if (!hasFormData) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const now = new Date();
      await saveInspectionDraft({
        draftKey,
        templateId,
        sasaranId: sasaranId ?? null,
        formValues,
        metaValues,
        lat: lat ?? null,
        lng: lng ?? null,
        updatedAt: now.toISOString(),
      });
      setLastSaved(now);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [draftKey, templateId, sasaranId, formValues, metaValues, lat, lng, enabled]);

  const clearDraft = useCallback(async () => {
    await deleteInspectionDraft(draftKey);
    setDraft(null);
    setHasDraft(false);
    setLastSaved(null);
  }, [draftKey]);

  return {
    existingDraft: draft,
    hasDraft,
    lastSaved,
    clearDraft,
  };
}
