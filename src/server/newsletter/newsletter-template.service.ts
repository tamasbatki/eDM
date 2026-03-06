export interface NewsletterDraft {
  subject: string;
  preheader: string;
  title: string;
  lead: string;
  bodyHtml: string;
  ctaLabel: string;
}

function formatDate(dateIso = new Date().toISOString()): string {
  return new Date(dateIso).toLocaleString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderConcordeStyleNewsletterHtml(draft: NewsletterDraft, sourceUrl: string): string {
  const dateText = formatDate();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${draft.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F0F0;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 auto;background:#F0F0F0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="794" style="width:100%;max-width:794px;background:#FFFFFF;">
          <tr>
            <td style="background:#454547;color:#ffffff;padding:22px 28px;font-family:Verdana, Helvetica, sans-serif;font-size:24px;line-height:1.3;font-weight:400;text-transform:uppercase;">
              ${draft.title}
            </td>
          </tr>
          <tr>
            <td style="background:#6C6C6E;color:#D8D8D8;padding:10px 28px;font-family:Verdana, Helvetica, sans-serif;font-size:11px;">
              ${dateText}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 6px 28px;font-family:Verdana, Helvetica, sans-serif;font-size:13px;line-height:22px;color:#69696c;text-align:justify;">
              <p style="margin:0 0 14px 0;">${draft.lead}</p>
              ${draft.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <a href="${sourceUrl}" style="display:inline-block;background:#F18E00;color:#ffffff;text-decoration:none;font-family:Verdana, Helvetica, sans-serif;font-size:13px;padding:11px 16px;border-radius:4px;">
                ${draft.ctaLabel}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
