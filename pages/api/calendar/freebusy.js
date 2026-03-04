import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { google } from "googleapis";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "No autenticado" });

  // Si NextAuth detectó error de refresh
  if (session.error) {
    return res.status(401).json({ error: "TOKEN_EXPIRED_RELOGIN" });
  }

  const { from, to } = req.query;

  try {
    if (!session.accessToken) {
      return res.status(401).json({ error: "Falta access token" });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({ access_token: session.accessToken });

    const cal = google.calendar({ version: "v3", auth });

    // Freebusy real
    const fb = await cal.freebusy.query({
      requestBody: {
        timeMin: from,
        timeMax: to,
        items: [{ id: "primary" }],
      },
    });

    const busy = fb.data.calendars?.primary?.busy || [];
    return res.status(200).json({
      busy: busy.map((b) => ({ start: b.start, end: b.end })),
    });
  } catch (err) {
    console.error("FREEBUSY ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}