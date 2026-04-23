import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const tx = request.nextUrl.searchParams.get("tx") ?? "demo-tx";
  const payload = `Demo download generated for transaction: ${tx}\nThis is a placeholder file for marketplace testing.`;

  return new Response(payload, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=demo-template-${tx}.txt`,
      "Cache-Control": "no-store",
    },
  });
}
