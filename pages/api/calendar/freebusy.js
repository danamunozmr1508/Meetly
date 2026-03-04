import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { google } from "googleapis";

export default async function handler(req, res) {

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const { from, to } = req.query;

  try {

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: session.accessToken,
    });

    const calendar = google.calendar({
      version: "v3",
      auth,
    });

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: from,
        timeMax: to,
        items: [{ id: "primary" }],
      },
    });

    const busy = response.data.calendars.primary.busy;

    res.status(200).json({
      busy,
    });

  } catch (error) {

    console.error("FREEBUSY ERROR:", error);

    res.status(500).json({
      error: error.message,
    });

  }
}