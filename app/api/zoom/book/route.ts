import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { createZoomMeeting, refreshZoomToken } from "@/lib/zoom";
import { PrismaClient } from "@prisma/client";
import { subMinutes, addMinutes } from "date-fns";
const { prisma } = await import("@/lib/prisma");

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pipelineLeadId, scheduledAt } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.zoomAccessToken) {
    return NextResponse.json({ error: "Zoom not connected" }, { status: 400 });
  }

  const pipelineLead = await prisma.pipelineLead.findUnique({
    where: { id: pipelineLeadId },
    include: { leadCache: true },
  });

  if (!pipelineLead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Refresh token if needed
  let accessToken = user.zoomAccessToken;
  if (user.zoomTokenExpiry && user.zoomTokenExpiry < new Date()) {
    const refreshed = await refreshZoomToken(user.zoomRefreshToken!);
    accessToken = refreshed.access_token;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        zoomAccessToken: refreshed.access_token,
        zoomRefreshToken: refreshed.refresh_token,
      },
    });
  }

  const meetingTime = new Date(scheduledAt);

  const meeting = await createZoomMeeting({
    accessToken,
    businessName: pipelineLead.leadCache.businessName,
    scheduledAt: meetingTime,
    durationMinutes: 5,
  });

  // Save meeting + update pipeline lead
  await prisma.meeting.create({
    data: {
      pipelineLeadId,
      zoomMeetingId: String(meeting.id),
      zoomJoinUrl: meeting.join_url,
      scheduledAt: meetingTime,
    },
  });

  await prisma.pipelineLead.update({
    where: { id: pipelineLeadId },
    data: {
      status: "BOOKED",
      meetingAt: meetingTime,
      zoomMeetingId: String(meeting.id),
      zoomJoinUrl: meeting.join_url,
      statusChangedAt: new Date(),
    },
  });

  // Schedule follow-ups
  if (pipelineLead.leadCache.email) {
    // Follow-up 1: immediate
    await prisma.followUp.create({
      data: {
        userId: user.id,
        pipelineLeadId,
        type: "IMMEDIATE",
        channel: "EMAIL",
        scheduledFor: new Date(),
      },
    });

    // Follow-up 2: 1.5 hours before
    await prisma.followUp.create({
      data: {
        userId: user.id,
        pipelineLeadId,
        type: "REMINDER",
        channel: "EMAIL",
        scheduledFor: subMinutes(meetingTime, 90),
      },
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      pipelineLeadId,
      action: "MEETING_BOOKED",
      toStatus: "BOOKED",
      metadata: { zoomMeetingId: meeting.id, scheduledAt },
    },
  });

  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.dailyStats.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: { meetingsBooked: { increment: 1 } },
    create: { userId: user.id, date: today, meetingsBooked: 1 },
  });

  return NextResponse.json({
    success: true,
    joinUrl: meeting.join_url,
    meetingId: meeting.id,
  });
}
