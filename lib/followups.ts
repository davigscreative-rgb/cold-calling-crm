import { Resend } from "resend";
import { generateFollowUpEmail } from "./claude";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendFollowUpEmail(params: {
  to: string;
  type: "IMMEDIATE" | "REMINDER";
  businessName: string;
  ownerName: string | null;
  industry: string;
  meetingTime: Date;
  zoomJoinUrl: string;
  userName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { subject, body } = await generateFollowUpEmail(params);

    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL ?? "outreach@yourdomain.com",
      to: params.to,
      subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function sendFollowUpSMS(params: {
  to: string;
  type: "IMMEDIATE" | "REMINDER";
  businessName: string;
  meetingTime: Date;
  zoomJoinUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const timeStr = params.meetingTime.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const message =
      params.type === "IMMEDIATE"
        ? `Hi! Confirmed our 5-min Zoom call for ${timeStr}. Join here: ${params.zoomJoinUrl} — Reply STOP to opt out`
        : `Reminder: Our Zoom call for ${params.businessName} is in 90 min (${timeStr}). Join: ${params.zoomJoinUrl}`;

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
