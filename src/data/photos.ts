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
  location: string;
  date: string;
  tags: string[];
}
