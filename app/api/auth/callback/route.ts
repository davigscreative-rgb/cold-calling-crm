import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/scan";

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.user?.email) {
      // Upsert user in our DB
      await prisma.user.upsert({
        where: { email: session.user.email },
        update: { name: session.user.user_metadata?.full_name },
        create: {
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
        },
      }).catch(() => {});
      await prisma.$disconnect();
    }
  }

  return NextResponse.redirect(new URL(next, req.url));
}

