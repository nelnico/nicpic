import { redirect } from "next/navigation";

// Editing now happens in a dialog on the admin hub.
export default function EditRedirect() {
  redirect("/admin");
}
