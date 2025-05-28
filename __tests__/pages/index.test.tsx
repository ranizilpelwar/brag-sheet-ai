import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import Home from "../../pages/index";
import { useSession } from "next-auth/react";

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ paragraphs: ["test paragraph"] }),
    ok: true
  })
) as jest.Mock;

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

describe("Home Component", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock authenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { email: "test@example.com" } },
      status: "authenticated"
    });
  });

  it("should handle document loading", async () => {
    render(<Home />);

    const input = screen.getByPlaceholderText("Paste your Google Doc URL here");
    await userEvent.type(input, "https://docs.google.com/document/d/123");

    const loadButton = screen.getByText("📄 Load Document");
    await userEvent.click(loadButton);

    await waitFor(() => {
      expect(
        screen.getByText("✅ Google Doc retrieved successfully!")
      ).toBeInTheDocument();
    });
  });

  it("should handle model selection", async () => {
    render(<Home />);

    const modelSelect = screen.getByLabelText("Select Model:");
    await userEvent.selectOptions(modelSelect, "mistral");

    expect(modelSelect).toHaveValue("mistral");
  });
});
