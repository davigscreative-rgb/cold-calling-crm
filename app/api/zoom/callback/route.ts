import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { exchangeZoomCode } from "@/lib/zoom";
import { PrismaClient } from "@prisma/client";
import { addSeconds } from "date-fns";

const { prisma } = await import("@/lib/prisma");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?zoom=error`
    );
  }

  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  try {
    const tokens = await exchangeZoomCode(code);

    await prisma.user.update({
      where: { email: session.user.email! },
      data: {
        zoomAccessToken: tokens.access_token,
        zoomRefreshToken: tokens.refresh_token,
        zoomTokenExpiry: addSeconds(new Date(), tokens.expires_in),
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?zoom=connected`
    );
  } catch (err) {
    console.error("Zoom callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?zoom=error`
    );
  } finally {
    await prisma.$disconnect();
  }
}

