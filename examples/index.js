// @ts-check
const report = require("../out");
const path = require("path");
const puppeteer = require("puppeteer-core");
const fs = require("fs/promises");
const example = process.argv[2];

async function main() {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://URL/?token=TOKEN`,
  });

  try {
    const file = path.join(__dirname, example, "index.html");
    const html = await fs.readFile(file, "utf-8");

    const page = await browser.newPage();

    const out = await report.pdf(
      page,
      html,
      { waitUntil: "load" },
      {
        format: "a4",
      }
    );

    await fs.writeFile(path.join(__dirname, example, "out.pdf"), out);
  } finally {
    await browser.close();
  }
}

main().catch((err) => console.error(err));
