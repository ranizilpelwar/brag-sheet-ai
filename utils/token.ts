export const estimateTokens = (text: string) => {
  return Math.ceil(text.length / 4);
};
