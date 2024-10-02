import { load } from "cheerio";
import { PDFDocument } from "pdf-lib";
import type { Page, PDFOptions, WaitForOptions } from "puppeteer-core";
import * as core from "./core";

function sectionsCount(html: string) {
  const $ = load(html);
  return $("body > section").length;
}

function isValidReportHtml(html: string) {
  return sectionsCount(html) > 0;
}

/**
 * Convert a Page to PDF
 * @param page puppeteer/puppeteer-core page object
 * @param options output PDF options
 * @returns PDF as an array of bytes
 */
async function pdf(
  page: Page,
  html: string,
  waitForOptions?: WaitForOptions,
  pdfOptions?: PDFOptions
) {
  const margin = {
    marginTop: pdfOptions?.margin?.top ?? 0,
    marginBottom: pdfOptions?.margin?.bottom ?? 0,
  };

  const nSections = sectionsCount(html);

  const sections: PDFDocument[] = [];

  // open page via string html

  for (let i = 1; i <= nSections; i++) {
    // reset page
    await page.setContent(html, waitForOptions);

    await page.evaluate(...core.showOnlySection(i));

    const { headerHeight, footerHeight } = await page.evaluate(
      ...core.getHeightEvaluator(
        margin.marginTop,
        margin.marginBottom,
        pdfOptions?.scale
      )
    );

    await page.evaluate(...core.getBaseEvaluator(headerHeight, footerHeight));
    const basePdfBuffer = await page.pdf(pdfOptions);
    const bodyDoc = await PDFDocument.load(basePdfBuffer);

    await page.evaluate(...core.getHeadersEvaluator(bodyDoc));
    const headerPdf = await page.pdf(pdfOptions);

    const result = await core.createReport(
      bodyDoc,
      headerPdf,
      headerHeight,
      footerHeight
    );

    sections.push(result);
  }

  const document = await PDFDocument.create();
  for (const section of sections) {
    const pages = await document.copyPages(section, section.getPageIndices());
    for (const page of pages) {
      document.addPage(page);
    }
  }

  const result = await document.save();

  return Buffer.from(result);
}

export { pdf, isValidReportHtml };
export default { pdf, isValidReportHtml };
