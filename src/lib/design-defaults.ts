const fontBody = 'Verdana, Helvetica, sans-serif';
const fontHeading = 'Arial, Helvetica, sans-serif';
const todayLabel = new Date().toLocaleDateString('hu-HU');

export const defaultChartDesign = {
  titleColor: '#454547',
  lineColor: '#F18E00',
  benchmarkColor: '#454547',
  axisTextColor: '#808083',
  gridColor: '#E5E5E7',
  fillColor: 'rgba(241,142,0,0.16)',
  fontFamily: fontBody,
} as const;

export const defaultEmailSnippets = {
  cta: `
    <mj-button
      align="left"
      background-color="#F18E00"
      color="#ffffff"
      font-family="${fontHeading}"
      font-size="14px"
      border-radius="4px"
      inner-padding="14px 22px"
      href="{{pdf_url}}"
    >
      Megnyitas
    </mj-button>
  `,
  chart: `
    <mj-image
      src="{{chart_image_url}}"
      alt="Piaci grafikon"
      padding="0"
      fluid-on-mobile="true"
      border="1px solid #E5E5E7"
    />
  `,
} as const;

export const defaultEmailTemplate = `
  <mjml>
    <mj-head>
      <mj-attributes>
        <mj-all font-family="${fontBody}" />
        <mj-text color="#454547" font-size="14px" line-height="22px" padding="0" />
        <mj-section background-color="#ffffff" padding="0" />
        <mj-column padding="0" />
        <mj-button font-family="${fontHeading}" />
      </mj-attributes>
      <mj-style inline="inline">
        .content-card div {
          text-align: left;
        }
      </mj-style>
    </mj-head>
    <mj-body background-color="#F3F4F6" width="794px">
      <mj-wrapper padding="24px 12px" background-color="#ffffff" border="1px solid #E5E5E7" css-class="content-card">
        <mj-section background-color="#454547" padding="24px 30px 18px 30px">
          <mj-column>
            <mj-text color="#ffffff" font-family="${fontHeading}" font-size="28px" font-weight="700" letter-spacing="0.4px">
              {{portfolio_name}} - napi hirlevel
            </mj-text>
            <mj-text color="#D8D8D8" font-size="12px" padding-top="8px">
              {{advisor_name}} | frissitve: ${todayLabel}
            </mj-text>
          </mj-column>
        </mj-section>

        <mj-section padding="30px 30px 10px 30px">
          <mj-column>
            <mj-text>Kedves {{client_name}},</mj-text>
            <mj-text padding-top="12px">
              Itt a mai osszefoglalo a kiemelt cikkrol es piaci kontextusrol.
            </mj-text>
          </mj-column>
        </mj-section>

        {{content_block}}

        <mj-section padding="0 30px 18px 30px">
          <mj-column>
            ${defaultEmailSnippets.chart}
          </mj-column>
        </mj-section>

        <mj-section padding="0 30px 30px 30px">
          <mj-column>
            ${defaultEmailSnippets.cta}
          </mj-column>
        </mj-section>
      </mj-wrapper>
    </mj-body>
  </mjml>
`;
