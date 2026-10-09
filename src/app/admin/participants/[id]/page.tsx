import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAdminParticipantDetail } from "@/lib/admin-service";
import { redirect, notFound } from "next/navigation";
import { ParticipantDetailView } from "@/components/admin/ParticipantDetailView";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    redirect("/admin/login");
  }

  const { id } = await params;
  if (!id) {
    notFound();
  }

  const data = await getAdminParticipantDetail(id).catch(() => null);
  if (!data) {
    notFound();
  }

  return <ParticipantDetailView data={data} />;
}
