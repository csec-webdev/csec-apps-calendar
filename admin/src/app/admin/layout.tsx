import { requireRole } from "@/lib/requireAdmin";
import { AdminLayout } from "@/components/AdminLayout";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, role } = await requireRole();

  return (
    <AdminLayout userEmail={session?.user?.email ?? undefined} userRole={role}>
      {children}
    </AdminLayout>
  );
}

