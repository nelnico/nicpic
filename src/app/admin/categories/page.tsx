import { redirect } from "next/navigation";

// The library (categories/locations/cameras/lenses) now lives on the admin hub.
export default function CategoriesRedirect() {
  redirect("/admin");
}
