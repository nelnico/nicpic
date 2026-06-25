import { PhotosManager } from "@/components/admin/photos-manager";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { AlbumsManager } from "@/components/admin/albums-manager";

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <PhotosManager />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Library
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          <AlbumsManager />
        </div>
      </div>
    </div>
  );
}
