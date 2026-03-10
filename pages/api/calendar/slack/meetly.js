export default async function handler(req, res) {

  const { text, user_name } = req.body;

  const parts = text.split(" ");

  const duration = parts[0];
  const emails = parts.slice(1);

  res.status(200).json({
    response_type: "in_channel",
    text: `🔎 ${user_name} quiere agendar una reunión de ${duration} con ${emails.join(", ")}`
  });

}