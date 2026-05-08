import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendFollowUpEmail, sendFollowUpSMS } from "@/lib/followups";
import { addMinutes } from "date-fns";

const prisma = new PrismaClient();

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = addMinutes(now, 16);

  const pendingFollowUps = await prisma.followUp.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { gte: now, lte: windowEnd },
    },
    include: {
      pipelineLead: {
        include: { leadCache: true },
      },
      user: true,
    },
  });

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const followUp of pendingFollowUps) {
    const { pipelineLead, user } = followUp;
    const lead = pipelineLead.leadCache;

    try {
      if (followUp.channel === "EMAIL" && lead.email) {
        const result = await sendFollowUpEmail({
          to: lead.email,
          type: followUp.type,
          businessName: lead.businessName,
          ownerName: lead.ownerName,
          industry: lead.industry,
          meetingTime: pipelineLead.meetingAt ?? new Date(),
          zoomJoinUrl: pipelineLead.zoomJoinUrl ?? "",
          userName: user.name ?? user.email,
        });

        if (result.success) {
          await prisma.followUp.update({
            where: { id: followUp.id },
            data: { status: "SENT", sentAt: new Date() },
          });
          results.sent++;
        } else {
          await prisma.followUp.update({
            where: { id: followUp.id },
            data: { status: "FAILED", error: result.error },
          });
          results.failed++;
        }
      }

      if (followUp.channel === "SMS" && lead.phone && user.twilioEnabled) {
        const result = await sendFollowUpSMS({
          to: lead.phone,
          type: followUp.type,
          businessName: lead.businessName,
          meetingTime: pipelineLead.meetingAt ?? new Date(),
          zoomJoinUrl: pipelineLead.zoomJoinUrl ?? "",
        });

        if (result.success) {
          await prisma.followUp.update({
            where: { id: followUp.id },
            data: { status: "SENT", sentAt: new Date() },
          });
          results.sent++;
        } else {
          results.failed++;
        }
      }
    } catch (err) {
      results.failed++;
      results.errors.push(String(err));
      await prisma.followUp.update({
        where: { id: followUp.id },
        data: { status: "FAILED", error: String(err) },
      });
    }
  }

  await prisma.$disconnect();
  return NextResponse.json({ ...results, processed: pendingFollowUps.length });
}
