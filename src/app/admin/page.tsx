import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [photos, categories, locations] = await Promise.all([
      prisma.photo.count(),
      prisma.category.count(),
      prisma.location.count(),
    ]);
    return { photos, categories, locations, error: false };
  } catch {
    return { photos: 0, categories: 0, locations: 0, error: true };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const links = [
    {
      href: "/admin/upload",
      title: "Upload new photo",
      description: "Add a photo to the portfolio.",
    },
    {
      href: "/admin/photos",
      title: "Manage photos",
      description: "Edit featured status or delete photos.",
    },
    {
      href: "/admin/categories",
      title: "Categories & locations",
      description: "Create the categories and locations you organise by.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Admin Dashboard</h1>

      {stats.error && (
        <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Could not reach the database yet. Set <code>DATABASE_URL</code> in{" "}
          <code>.env.local</code> and run the migration.
        </p>
      )}

      <div className="mb-8 grid grid-cols-3 gap-4">
        <Stat label="Photos" value={stats.photos} />
        <Stat label="Categories" value={stats.categories} />
        <Stat label="Locations" value={stats.locations} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
