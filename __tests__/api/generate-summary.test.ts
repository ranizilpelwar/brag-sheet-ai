import { createMocks } from "node-mocks-http";
import handler from "../../pages/api/generate-summary";
import { mockLLMClient } from "../../mocks/llmClient";

jest.mock("../../llm/providers", () => ({
  getLLMClient: () => mockLLMClient,
  SUPPORTED_MODELS: {
    mistral: "Mistral AI",
    llama2: "Llama 2"
  }
}));

describe("generate-summary API", () => {
  it("should handle successful generation", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        section: "test content",
        provider: "litellm",
        model: "mistral"
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty("output");
  });

  it("should handle errors gracefully", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        section: "",
        provider: "litellm",
        model: "mistral"
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it("should validate model selection", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        section: "test content",
        provider: "litellm",
        model: "invalid-model"
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toHaveProperty("error");
  });
});
