import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import Home from "../../pages/index";
import { useSession } from "next-auth/react";
import { act } from "react";
import { useState } from "react";

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

  it("shows a section dropdown with headings after loading a Google Doc", async () => {
    // Mock headings in the document
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            paragraphs: [
              "heading 1: Introduction",
              "Some content here",
              "heading 2: Project Overview",
              "More content",
              "heading 3: Results",
              "Final content"
            ]
          }),
        ok: true
      })
    );

    render(<Home />);

    // Load the document
    const input = screen.getByPlaceholderText("Paste your Google Doc URL here");
    await userEvent.type(input, "https://docs.google.com/document/d/123");

    const loadButton = screen.getByText("📄 Load Document");
    await userEvent.click(loadButton);

    // Wait for the success message
    await waitFor(() => {
      expect(
        screen.getByText("✅ Google Doc retrieved successfully!")
      ).toBeInTheDocument();
    });

    // Check if the section dropdown appears
    const sectionSelect = screen.getByLabelText("Select Section:");
    expect(sectionSelect).toBeInTheDocument();

    // Verify the headings are in the dropdown
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Project Overview")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();

    // Verify the first heading is selected by default
    expect(sectionSelect).toHaveValue("Introduction");
  });

  it("should show a non-zero elapsed time for the first model output", async () => {
    // Mock the document fetch
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            paragraphs: ["heading 1: Test Section", "Some content"]
          }),
        ok: true
      })
    );

    // Mock the generate-summary API call with a longer delay
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              json: () => Promise.resolve({ output: "Generated summary" }),
              ok: true
            });
          }, 1000); // Use a longer delay to ensure elapsed time is non-zero
        })
    );

    render(<Home />);

    // Load the document
    const input = screen.getByPlaceholderText("Paste your Google Doc URL here");
    await userEvent.type(input, "https://docs.google.com/document/d/123");

    const loadButton = screen.getByText("📄 Load Document");
    await userEvent.click(loadButton);

    // Wait for document to load
    await waitFor(() => {
      expect(
        screen.getByText("✅ Google Doc retrieved successfully!")
      ).toBeInTheDocument();
    });

    // Select a model
    const modelSelect = screen.getByLabelText("Select Model:");
    await userEvent.selectOptions(modelSelect, "mistral");

    // Click generate button
    const generateButton = screen.getByText("✨ Generate with Selected Model");
    await userEvent.click(generateButton);

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByText("✨ Generating...")).toBeInTheDocument();
    });

    // Wait for loading state to complete and model output to appear
    await waitFor(
      () => {
        expect(screen.queryByText("✨ Generating...")).not.toBeInTheDocument();
        expect(screen.getByText("Generated summary")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Check that elapsed time is greater than 0m 0s
    const elapsedTimeSpan = screen.getByText(/⏱️ (?!0m 0s)\d+m \d+s/);
    expect(elapsedTimeSpan).toBeInTheDocument();
  });
});
