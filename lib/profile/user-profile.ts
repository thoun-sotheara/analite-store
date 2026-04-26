import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles, users } from "@/lib/db/schema";

export type AppUserProfile = {
  displayName: string;
  avatarUrl: string;
  bio: string;
  location: string;
  website: string;
  timezone: string;
  phone: string;
  favoriteCategory: string;
};

export const emptyUserProfile: AppUserProfile = {
  displayName: "",
  avatarUrl: "",
  bio: "",
  location: "",
  website: "",
  timezone: "",
  phone: "",
  favoriteCategory: "",
};

export async function getUserProfileByEmail(email: string, fallbackName = "", fallbackImage = ""): Promise<AppUserProfile> {
  if (!db) {
    return {
      ...emptyUserProfile,
      displayName: fallbackName,
      avatarUrl: fallbackImage,
    };
  }

  const [row] = await db
    .select({
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      location: userProfiles.location,
      websiteUrl: userProfiles.websiteUrl,
      timezone: userProfiles.timezone,
      phone: userProfiles.phone,
      favoriteCategory: userProfiles.favoriteCategory,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      userBio: users.bio,
      userLocation: users.location,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.email, email))
    .limit(1);

  if (!row) {
    return {
      ...emptyUserProfile,
      displayName: fallbackName,
      avatarUrl: fallbackImage,
    };
  }

  return {
    displayName: row.displayName ?? row.userName ?? fallbackName,
    avatarUrl: row.avatarUrl ?? row.userAvatarUrl ?? fallbackImage,
    bio: row.bio ?? row.userBio ?? "",
    location: row.location ?? row.userLocation ?? "",
    website: row.websiteUrl ?? "",
    timezone: row.timezone ?? "",
    phone: row.phone ?? "",
    favoriteCategory: row.favoriteCategory ?? "",
  };
}