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
    
    // 🔹 1. Mapear eventos
    const events = (r.data.items || []).map(e => ({
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
    }));

    // 🔹 2. Función para encontrar espacio disponible
    function findAvailableSlot(events, from, to, durationMinutes = 15) {
      const WORK_START_HOUR = 7;
      const WORK_START_MINUTE = 30;
      const WORK_END_HOUR = 17;

      const LUNCH_START_HOUR = 13;
      const LUNCH_END_HOUR = 14;

      const startDate = new Date(from);
      const endDate = new Date(to);

      let currentDay = new Date(startDate);

      while (currentDay <= endDate) {

        const workStart = new Date(currentDay);
        workStart.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);

        const workEnd = new Date(currentDay);
        workEnd.setHours(WORK_END_HOUR, 0, 0, 0);

        const lunchStart = new Date(currentDay);
        lunchStart.setHours(LUNCH_START_HOUR, 0, 0, 0);

        const lunchEnd = new Date(currentDay);
        lunchEnd.setHours(LUNCH_END_HOUR, 0, 0, 0);

        const dayEvents = events
          .map(e => ({
            start: new Date(e.start),
            end: new Date(e.end),
          }))
          .filter(e => e.start < workEnd && e.end > workStart)
          .sort((a, b) => a.start - b.start);

        let pointer = new Date(workStart);

        for (const event of dayEvents) {

          // Saltar almuerzo
          if (pointer < lunchStart && event.start > lunchStart) {
            if ((lunchStart - pointer) / 60000 >= durationMinutes) {
              return {
                start: pointer,
                end: new Date(pointer.getTime() + durationMinutes * 60000),
              };
            }
            pointer = lunchEnd;
          }

          const gap = (event.start - pointer) / 60000;

          if (gap >= durationMinutes) {
            return {
              start: pointer,
              end: new Date(pointer.getTime() + durationMinutes * 60000),
            };
          }

          pointer = new Date(Math.max(pointer, event.end));
        }

        if ((workEnd - pointer) / 60000 >= durationMinutes) {
          return {
            start: pointer,
            end: new Date(pointer.getTime() + durationMinutes * 60000),
          };
        }

        currentDay.setDate(currentDay.getDate() + 1);
      }

      return null;
    }

    // 🔹 3. Buscar espacio de 15 minutos
    const availableSlot = findAvailableSlot(events, from, to, 15);

    // 🔹 4. Responder con eventos + disponibilidad
    res.status(200).json({
      events,
      availableSlot,
    });

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}