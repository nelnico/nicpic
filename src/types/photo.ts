// Shape consumed by the public gallery components (from the Lovable design).
// Real data is loaded from the database and mapped into this shape in
// src/app/page.tsx — categories are dynamic strings, not a fixed union.
export type Category = string;

export interface Photo {
  id: string;
  src: string;
  width: number;
  height: number;
  title: string;
  category: string;
  /** Structured location name ("" when none). */
  location: string;
  /** Free-text "where taken" detail ("" when none). */
  where: string;
  date: string;
  tags: string[];
  /** Optional description ("" when none). */
  description: string;
  // Camera gear (FK taxonomy, "" when not set).
  camera: string;
  lens: string;
  // EXIF fields ("" when not set).
  cameraMake: string;
  cameraModel: string;
  iso: string;
  aperture: string;
  shutterSpeed: string;
  focalLength: string;
  focalLength35mm: string;
  exposureMode: string;
  meteringMode: string;
  flash: string;
}
