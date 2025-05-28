import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import Home from "../../pages/index";
import { useSession } from "next-auth/react";
import { act } from "react-dom/test-utils";

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  (console.log as jest.Mock).mockRestore();
});

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

  it("should show a non-zero elapsed time for the first model output", async () => {
    // Mock fetch for document loading and summary generation
    (global.fetch as jest.Mock)
      // fetchDoc
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            paragraphs: [
              "Delivery Wins / What You Built\nDid something great\nConsulting Wins / How You Influenced"
            ]
          }),
        ok: true
      })
      // generate-summary
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            output: "Situation: ... Behavior: ... Impact: ..."
          }),
        ok: true
      });

    render(<Home />);

    // Load document
    const input = screen.getByPlaceholderText("Paste your Google Doc URL here");
    await userEvent.type(input, "https://docs.google.com/document/d/123");
    const loadButton = screen.getByText("📄 Load Document");
    await userEvent.click(loadButton);

    await waitFor(() => {
      expect(
        screen.getByText("✅ Google Doc retrieved successfully!")
      ).toBeInTheDocument();
    });

    // Use fake timers to simulate time passing
    jest.useFakeTimers();

    // Click generate and simulate 3 seconds of elapsed time
    const generateButton = screen.getByText(/Generate with Selected Model/);
    await act(async () => {
      generateButton.click();
      jest.advanceTimersByTime(3000); // 3 seconds
      // Let all pending promises resolve
      await Promise.resolve();
    });

    // Now, flush all timers and promises to ensure UI updates
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    // Wait for the output to appear (look for the summary text)
    await waitFor(() => {
      expect(screen.getByText(/Situation:/)).toBeInTheDocument();
    });

    // The output should NOT be 0m 0s
    const elapsedTimeElement = screen.getByText(/⏱️/);
    expect(elapsedTimeElement.textContent).not.toMatch(/0m 0s/);

    // Optionally, check that it matches the simulated time
    expect(elapsedTimeElement.textContent).toMatch(/0m 3s/);

    jest.useRealTimers();
  });
});
