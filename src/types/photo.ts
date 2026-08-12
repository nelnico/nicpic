// Shape consumed by the public gallery components (from the Lovable design).
// Real data is loaded from the database and mapped into this shape in
// src/app/page.tsx — categories are dynamic strings, not a fixed union.
export type Category = string;

export interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  width: number;
  height: number;
  title: string;
  category: string;
  /** Structured location name ("" when none). */
  location: string;
  date: string;
  tags: string[];
  // EXIF fields ("" when not set).
  cameraMake: string;
  cameraModel: string;
  iso: string;
  aperture: string;
  shutterSpeed: string;
  focalLength: string;
  exposureMode: string;
  meteringMode: string;
  flash: string;
}
