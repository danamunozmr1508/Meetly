import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { google } from "googleapis";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "No autenticado" });
  
  const { from, to } = req.query;
  
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    
    const cal = google.calendar({ version: "v3", auth });
    const r = await cal.events.list({
      calendarId: "primary",
      timeMin: from,
      timeMax: to,
      singleEvents: true,
      orderBy: "startTime",
    });
    
    const events = (r.data.items || []).map(e => ({
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
    }));
    
    res.status(200).json({ events });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}