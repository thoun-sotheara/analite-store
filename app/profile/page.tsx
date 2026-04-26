import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { getLibraryItems } from "@/lib/library/get-library-items";
import { getUserProfileByEmail } from "@/lib/profile/user-profile";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth?mode=signin&redirect=/profile");
  }

  const [purchases, profile] = await Promise.all([
    getLibraryItems(session.user.email),
    getUserProfileByEmail(session.user.email, session.user.name ?? "New User", session.user.image ?? ""),
  ]);

  return (
    <ProfilePanel
      email={session.user.email}
      initialProfile={profile}
      purchases={purchases}
    />
  );
}
