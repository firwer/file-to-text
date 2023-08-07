// author: https://github.com/firwer/
// date: 05-08-23
// gcloud function node.js doc/pdf parser

const express = require("express");
const app = express();
const mammoth = require("mammoth");
const pdfjs = require("pdfjs-dist");

// Node.js doesn't have a built-in multipart/form-data parsing library.
// Use the 'busboy' library from NPM to parse these requests.
const Busboy = require("busboy");

app.post("/", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  if (req.method !== "POST") {
    return res.status(405).sendStatus("Method Not Allowed");
  }
  const busboy = Busboy({ headers: req.headers });

  busboy.on("file", (name, file, info) => {
    const { filename, encoding, mimeType } = info;
    const chunks = [];
    file.on("data", (data) => {
      chunks.push(data);
    });
    file.on("end", async () => {
      const buffer = Buffer.concat(chunks);
      const fileArray = new Uint8Array(buffer);
      var outputText;
      switch (mimeType) {
        case "application/pdf":
          console.log("PDF file");
          const pdfDoc = await pdfjs.getDocument({ data: fileArray }).promise;
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const pageTextContent = await page.getTextContent();
            outputText += pageTextContent.items
              .map((item) => item.str)
              .join(" ");
          }
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        case "application/msword":
          console.log("Word file");
          // Parse .doc/.docx file with excess newlines removed
          const regex = /\n{2,}/g;
          outputText = await mammoth
            .extractRawText({ buffer })
            .then((result) => result.value.replace(regex, "\n"));
          break;
        default:
          console.log("Unsupported file type");
          return res.status(400).end();
      }
      res.status(200).send(outputText);
    });
  });
  busboy.end(req.rawBody);
});

exports.parseDoc = (req, res) => {
  return app(req, res);
};
