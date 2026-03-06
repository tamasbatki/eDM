const fontBody = 'Verdana, Helvetica, sans-serif';

export const defaultChartDesign = {
  titleColor: "#454547",
  lineColor: "#F18E00",
  benchmarkColor: "#454547",
  axisTextColor: "#808083",
  gridColor: "#E5E5E7",
  fillColor: "rgba(241,142,0,0.16)",
  fontFamily: fontBody,
} as const;

export const defaultEmailSnippets = {
  cta: `<a href="{{pdf_url}}" style="display:inline-block;padding:11px 16px;background:#F18E00;color:#ffffff;text-decoration:none;border-radius:4px;font-family:${fontBody};font-size:13px;">A teljes cikkert kattintson ide</a>`,
  chart: `<img src="{{chart_image_url}}" alt="Piaci grafikon" style="max-width:100%;height:auto;border:1px solid #E5E5E7;" />`,
} as const;

export const defaultEmailTemplate = `
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0;padding:0;background:#F0F0F0;">
  <tr>
    <td align="center" style="padding:20px 10px;">
      <table border="0" cellpadding="0" cellspacing="0" width="794" style="width:100%;max-width:794px;background:#ffffff;">
        <tr>
          <td style="padding:20px 30px;background:#454547;color:#ffffff;font-family:${fontBody};font-size:24px;line-height:1.3;font-weight:normal;text-transform:uppercase;">
            {{portfolio_name}} - napi hirlevel
          </td>
        </tr>
        <tr>
          <td style="background:#6C6C6E;color:#D8D8D8;padding:10px 30px;font-family:${fontBody};font-size:11px;">
            {{advisor_name}} | frissitve: ${new Date().toLocaleDateString("hu-HU")}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 20px 10px 20px;text-align:justify;font-family:${fontBody};font-size:13px;line-height:22px;color:#69696c;">
            <p style="margin:0 0 12px 0;">Kedves {{client_name}},</p>
            <p style="margin:0 0 12px 0;">Itt a mai osszefoglalo a kiemelt cikkrol es piaci kontextusrol.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 16px 20px;">${defaultEmailSnippets.chart}</td>
        </tr>
        <tr>
          <td style="padding:0 20px 24px 20px;">${defaultEmailSnippets.cta}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;
