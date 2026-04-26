 "use client";
 
 import { upload } from "@vercel/blob/client";
 
 export type UploadTarget = "templates" | "images";
 
 function generatePathname(file: File, target: UploadTarget): string {
   const now = new Date();
   const y = now.getFullYear();
   const m = String(now.getMonth() + 1).padStart(2, "0");
   const safeName = file.name
     .toLowerCase()
     .replace(/[^a-z0-9._-]+/g, "-")
     .replace(/^-+|-+$/g, "")
     .slice(0, 120) || "file";
   const uid = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
   return `uploads/${target}/${y}/${m}/${uid}-${safeName}`;
 }
 
 export async function uploadToFirebaseStorage(
   file: File,
   target: UploadTarget,
   onProgress?: (pct: number) => void,
 ): Promise<{ key: string; publicUrl: string }> {
   const pathname = generatePathname(file, target);
 
   const blob = await upload(pathname, file, {
     access: "public",
     handleUploadUrl: "/api/admin/upload",
     onUploadProgress: onProgress
       ? ({ percentage }) => onProgress(Math.round(percentage))
       : undefined,
   });
 
   return { key: blob.pathname, publicUrl: blob.url };
 }
