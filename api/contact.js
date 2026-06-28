const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Object.fromEntries(new URLSearchParams(req.body));
  }

  return {};
}

module.exports = async function contact(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL || "Graphic Design Israel <onboarding@resend.dev>";

  if (!apiKey || !toEmail) {
    return res.status(503).json({ ok: false, error: "Contact endpoint is not configured" });
  }

  const body = parseBody(req);

  if (body._honey) {
    return res.status(200).json({ ok: true });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const rows = [
    ["Name", name],
    ["Email", email],
    ["Phone", body.phone],
    ["Company", body.company],
    ["Project type", body.project_type],
    ["Timeline", body.timeline],
    ["Message", message]
  ];

  const htmlRows = rows
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join("");

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: "New Graphic Design Israel inquiry",
      html: `
        <h1>New Graphic Design Israel inquiry</h1>
        <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
          ${htmlRows}
        </table>
      `
    })
  });

  if (!response.ok) {
    return res.status(502).json({ ok: false, error: "Email delivery failed" });
  }

  return res.status(200).json({ ok: true });
};
