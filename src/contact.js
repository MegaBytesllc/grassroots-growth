// Relays contact-form submissions to the inquiries inbox via Resend.
//
// Required environment variable (set as an encrypted secret):
//   RESEND_API_KEY   API key from resend.com
// Optional:
//   CONTACT_TO       destination inbox (defaults below)
//   CONTACT_FROM     verified sender, e.g. "Website <hello@yourdomain.com>"

const MAX_LENGTH = { name: 100, org: 120, email: 200, message: 5000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

export async function handleContact(request, env) {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  let submitted;
  try {
    const contentType = request.headers.get("content-type") || "";
    submitted = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json(400, { error: "We could not read that submission." });
  }

  // Honeypot: hidden to people, irresistible to bots. Fake success so they move on.
  if (submitted.company_website) return json(200, { ok: true });

  const fields = {
    name: String(submitted.name ?? "").trim(),
    org: String(submitted.org ?? "").trim(),
    email: String(submitted.email ?? "").trim(),
    message: String(submitted.message ?? "").trim(),
  };

  if (!fields.name || !fields.email || !fields.message) {
    return json(400, { error: "Name, email, and message are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return json(400, { error: "Please enter a valid email address." });
  }
  for (const [field, value] of Object.entries(fields)) {
    if (value.length > MAX_LENGTH[field]) {
      return json(400, { error: `That ${field} is longer than we can accept.` });
    }
  }

  if (!env.RESEND_API_KEY) {
    return json(503, {
      error: "The form is not configured yet. Please email us directly.",
    });
  }

  const details = [
    ["Name", fields.name],
    ["Organization", fields.org || "—"],
    ["Email", fields.email],
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM || "Website <onboarding@resend.dev>",
      to: [env.CONTACT_TO || "GGConsultingNY@outlook.com"],
      // Lets you reply straight from Outlook and reach the sender.
      reply_to: fields.email,
      subject: `New inquiry from ${fields.name}${fields.org ? ` (${fields.org})` : ""}`,
      text: [
        ...details.map(([label, value]) => `${label}: ${value}`),
        "",
        fields.message,
      ].join("\n"),
      html: `<h2>New website inquiry</h2>
<table cellpadding="6">${details
        .map(
          ([label, value]) =>
            `<tr><td><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>
<p style="white-space:pre-wrap">${escapeHtml(fields.message)}</p>`,
    }),
  });

  if (!response.ok) {
    console.log("Resend rejected the send", response.status, await response.text());
    return json(502, {
      error: "We could not send your message. Please email us directly.",
    });
  }

  return json(200, { ok: true });
}
