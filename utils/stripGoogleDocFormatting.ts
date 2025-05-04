export function extractPlainTextFromGoogleDoc(doc: any): string {
  if (!doc || !doc.body || !Array.isArray(doc.body.content)) {
    throw new Error("Invalid Google Doc format");
  }

  const lines: string[] = [];

  for (const block of doc.body.content) {
    if (block.paragraph?.elements) {
      const text = block.paragraph.elements
        .map((el) => el.textRun?.content || "")
        .join("")
        .trim();

      if (text) {
        lines.push(text);
      }
    }

    // Optional: skip tables, headers, images, etc.
  }

  // Normalize output to remove extra line breaks & spaces
  const cleaned = lines
    .join("\n")
    .replace(/\n{2,}/g, "\n") // Collapse double line breaks
    .replace(/•/g, "-") // Normalize bullets
    .replace(/\s{2,}/g, " ") // Collapse extra spaces
    .trim();

  return cleaned;
}
