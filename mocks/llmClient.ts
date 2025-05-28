export const mockLLMClient = {
  generate: jest.fn().mockImplementation(async ({ prompt }) => {
    if (prompt.includes("delivery wins")) {
      return "Mocked delivery wins summary";
    }
    return "Default mocked response";
  })
};
