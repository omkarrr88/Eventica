import { google } from "googleapis";

export async function addEventToGoogleCalendar(accessToken, eventData) {
  const { summary, description, startDateTime, endDateTime, attendees } = eventData;

  const oAuth2Client = new google.auth.OAuth2();
  oAuth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const event = {
    summary,
    description,
    start: { dateTime: startDateTime, timeZone: "Asia/Kolkata" },
    end: { dateTime: endDateTime, timeZone: "Asia/Kolkata" },
    attendees: attendees?.map((email) => ({ email })) || [],
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });

  return response.data;
}
