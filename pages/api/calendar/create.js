import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "No autenticado" });
  
  const { title, start, end, attendees, addMeet, description } = req.body;
  
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    
    const cal = google.calendar({ version: "v3", auth });

    const organizerEmail = session.user.email;
    const allAttendees = Array.from(
      new Set([organizerEmail, ...attendees])
    );  
    
    const event = {
      summary: title || "Reunion",
      description,
      start: { dateTime: start, timeZone: "America/Bogota" },
      end: { dateTime: end, timeZone: "America/Bogota" },
      attendees: allAttendees.map(email => ({ email })),
      ...(addMeet && { conferenceData: { createRequest: {
        requestId: Math.random().toString(36).slice(2),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      }}}),
    };
    
    const r = await cal.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: addMeet ? 1 : 0,
      sendUpdates: "all",
    });
    
    res.status(200).json({ success: true, htmlLink: r.data.htmlLink });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}