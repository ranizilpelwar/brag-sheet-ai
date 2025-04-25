export const buildPrompt = (
  rawItems: string[],
  tone: string = "Professional"
) => {
  return `
Rewrite the following raw accomplishment notes in a ${tone} tone, suitable for a performance review or LinkedIn bullet points.

Raw notes:
${rawItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}

Polished Output:
`;
};
