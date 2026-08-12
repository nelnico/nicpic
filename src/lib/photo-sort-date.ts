// Gallery display order follows takenAt (when known), falling back to
// createdAt (upload time) for photos with no EXIF/manual taken date.
export function computeSortDate(takenAt: Date | null, createdAt: Date): Date {
  return takenAt ?? createdAt;
}
