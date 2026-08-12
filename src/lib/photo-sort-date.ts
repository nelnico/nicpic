// Gallery display order follows takenAt (when known), falling back to
// createdAt (upload time) for photos with no EXIF/manual taken date.
export function computeSortDate(takenAt: Date | null, createdAt: Date): Date {
  return takenAt ?? createdAt;
}

// "When taken" is set automatically — from the photo's EXIF capture date
// when present, otherwise the current date/time (no manual entry).
export function resolveTakenAt(exifTakenAt: string | Date | null | undefined): Date {
  if (!exifTakenAt) return new Date();
  return exifTakenAt instanceof Date ? exifTakenAt : new Date(exifTakenAt);
}
