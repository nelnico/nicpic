import { AdminHeader } from "@/components/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      {children}
    </div>
  );
}
