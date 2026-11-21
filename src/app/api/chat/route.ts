import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  mode: z.enum(["direct", "broadcast", "sequential_review"]),
  agentIds: z.array(z.string().min(1).max(80)).min(1).max(6)
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid_request", message: "Permintaan tidak valid. Periksa isi pesan, mode, dan daftar agent." },
      { status: 400 }
    );
  }

  // Deliberately fail closed until authentication, room authorization,
  // provider adapters, and usage controls are implemented.
  return NextResponse.json(
    {
      status: "not_configured",
      message: "Fondasi API aktif, tetapi koneksi provider belum dikonfigurasi. Belum ada pesan yang dikirim ke model eksternal. Tahap berikutnya adalah menambahkan autentikasi, adapter provider, dan kontrol biaya.",
      requestedMode: parsed.data.mode,
      selectedAgents: parsed.data.agentIds
    },
    { status: 501 }
  );
}