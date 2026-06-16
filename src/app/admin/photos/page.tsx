import { redirect } from "next/navigation";

// Photo management now lives on the admin hub.
export default function PhotosRedirect() {
  redirect("/admin");
}
