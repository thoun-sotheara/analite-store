"use client";

import { initializeApp, getApps } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

function getStorageInstance() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  const app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  return getStorage(app);
}

export type UploadTarget = "templates" | "images";

function generateKey(file: File, target: UploadTarget): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
  // Use crypto.randomUUID in browser
  const uid = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `uploads/${target}/${y}/${m}/${uid}-${safeName}`;
}

export async function uploadToFirebaseStorage(
  file: File,
  target: UploadTarget,
  onProgress?: (pct: number) => void,
): Promise<{ key: string; publicUrl: string }> {
  const storage = getStorageInstance();
  const key = generateKey(file, target);
  const storageRef = ref(storage, key);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type || undefined });
    task.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      reject,
      () => resolve(),
    );
  });

  const publicUrl = await getDownloadURL(storageRef);
  return { key, publicUrl };
}
