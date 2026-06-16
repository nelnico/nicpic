import { PhotosManager } from "@/components/photos-manager";
import { TaxonomyManager } from "@/components/taxonomy-manager";

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <PhotosManager />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Library
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <TaxonomyManager
            title="Categories"
            noun="category"
            kind="categories"
            placeholder="e.g. People"
          />
          <TaxonomyManager
            title="Locations"
            noun="location"
            kind="locations"
            placeholder="e.g. Cape Town"
          />
          <TaxonomyManager
            title="Cameras"
            noun="camera"
            kind="cameras"
            placeholder="e.g. Sony A7 IV"
          />
          <TaxonomyManager
            title="Lenses"
            noun="lens"
            kind="lenses"
            placeholder="e.g. 24-70mm f/2.8"
          />
        </div>
      </div>
    </div>
  );
}
