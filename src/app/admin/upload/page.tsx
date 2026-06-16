import { redirect } from "next/navigation";

// Uploading now happens in a dialog on the admin hub.
export default function UploadRedirect() {
  redirect("/admin");
}
