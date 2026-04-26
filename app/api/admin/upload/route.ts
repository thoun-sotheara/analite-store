import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import authOptions from "@/auth";

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only allow uploads to the uploads/ prefix
        if (!pathname.startsWith("uploads/")) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/zip",
            "application/x-zip-compressed",
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
