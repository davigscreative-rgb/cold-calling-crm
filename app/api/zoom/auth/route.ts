import { NextRequest, NextResponse } from "next/server";
import { getZoomAuthUrl } from "@/lib/zoom";

export async function GET(_req: NextRequest) {
  const url = getZoomAuthUrl();
  return NextResponse.redirect(url);
}

