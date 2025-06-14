import React, { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Spinner from "./components/Spinner";
import { staticInstructions } from "../utils/buildPrompt";
import fs from "fs";
import { SUPPORTED_MODELS } from "../llm/providers";

interface ModelOutput {
  model: string;
  output: string;
  timestamp: string;
  elapsedTime: string;
}

// Custom hook for elapsed time
function useElapsedTime(
  isRunning: boolean
): [number, (time: number) => void, number | null] {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      const now = Date.now();
      setStartTime(now);
      setElapsedTime(0);

      const intervalId = setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - now) / 1000);
        setElapsedTime(currentElapsed);
      }, 100);

      return () => {
        clearInterval(intervalId);
        setStartTime(null);
      };
    } else {
      setElapsedTime(0);
      setStartTime(null);
    }
  }, [isRunning]);

  return [elapsedTime, setElapsedTime, startTime];
}

export default function Home() {
  const { data: session, status } = useSession();
  const [docUrl, setDocUrl] = useState<string>("");
  const [docId, setDocId] = useState<string>("");
  const [items, setItems] = useState<string[]>([]);
  const [docRetrieved, setDocRetrieved] = useState<boolean>(false);
  const [fetchingDoc, setFetchingDoc] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useElapsedTime(loading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("mistral");
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [headings, setHeadings] = useState<string[]>([]);
  const generateStartTimeRef = useRef<number | null>(null);

  const extractDocId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const fetchDoc = async (docId: string) => {
    try {
      setFetchingDoc(true); // Start loading spinner
      setDocRetrieved(false); // Clear previous success

      const res = await fetch(
        `/api/fetch-doc?docId=${encodeURIComponent(docId)}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await res.json();

      if (data.paragraphs && data.paragraphs.length > 0) {
        setItems(data.paragraphs);
        console.log("Raw paragraphs:", data.paragraphs);
        // Extract headings from paragraphs
        const extractedHeadings = data.paragraphs
          .filter((p: string) => {
            const isHeading = p.toLowerCase().includes("heading");
            console.log("Paragraph:", p, "Is heading:", isHeading);
            return isHeading;
          })
          .map((p: string) => {
            const cleaned = p.replace(/^heading \d+: /i, "").trim();
            console.log("Original heading:", p, "Cleaned heading:", cleaned);
            return cleaned;
          });
        console.log("extractedHeadings", extractedHeadings);
        setHeadings(extractedHeadings);
        if (extractedHeadings.length > 0) {
          setSelectedSection(extractedHeadings[0]);
        }
        setDocRetrieved(true);
      } else {
        console.error("No paragraphs found in document");
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
    } finally {
      setFetchingDoc(false); // Always stop loading spinner
    }
  };

  const handleLoadDoc = () => {
    const id = extractDocId(docUrl);
    if (id) {
      setDocId(id);
      fetchDoc(id);
    } else {
      alert("Invalid Google Doc URL. Please check and try again.");
    }
  };
  const estimateTokens = (text: string) => {
    return Math.ceil(text.length / 4);
  };
  const staticInstructionTokenEstimate = estimateTokens(staticInstructions);
  const extractDeliveryWinsSection = (text: string) => {
    // Split the text into paragraphs
    const paragraphs = text.split("\n");
    let foundSection = false;
    let sectionContent: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];

      // Check if this is the start of our target section
      if (paragraph.toLowerCase().includes("delivery wins / what you built")) {
        foundSection = true;
        continue;
      }

      // If we found our section and hit the next heading, stop
      if (
        foundSection &&
        paragraph.toLowerCase().includes("consulting wins / how you influenced")
      ) {
        break;
      }

      // If we're in our target section, collect the content
      if (foundSection && paragraph.trim()) {
        sectionContent.push(paragraph);
      }
    }

    if (!foundSection) {
      console.log("❌ Could not find 'Delivery Wins / What You Built' section");
      return "";
    }

    const content = sectionContent.join("\n").trim();
    console.log("📋 Extracted Delivery Wins Section:", content);
    return content;
  };
  const generate = async () => {
    try {
      generateStartTimeRef.current = Date.now();
      setLoading(true);
      setErrorMessage(null);

      // Extract the selected section from all items
      const selectedSectionContent = extractSectionContent(
        items.join("\n"),
        selectedSection
      );

      if (!selectedSectionContent) {
        throw new Error(
          `Could not find section "${selectedSection}" in the document`
        );
      }

      // Generate summary using selected model
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: selectedSectionContent,
          provider: "litellm",
          model: selectedModel
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      // Calculate elapsed time directly
      const endTime = Date.now();
      const startTime = generateStartTimeRef.current;
      const finalElapsedTime = startTime
        ? Math.floor((endTime - startTime) / 1000)
        : 0;
      console.log("finalElapsedTime", finalElapsedTime);

      // Calculate elapsed time for the output using the final elapsed time
      const minutes = Math.floor(finalElapsedTime / 60);
      const seconds = finalElapsedTime % 60;
      const formattedTime = `${minutes}m ${seconds}s`;

      // Add new output to the list
      const newOutput: ModelOutput = {
        model: selectedModel,
        output: data.output,
        timestamp: new Date().toLocaleTimeString(),
        elapsedTime: formattedTime
      };

      setModelOutputs((prev) => [...prev, newOutput]);
      setResult(data.output);
    } catch (error: any) {
      console.error("Generation error:", error.message);
      setErrorMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
      generateStartTimeRef.current = null;
    }
  };

  const clearOutputs = () => {
    setModelOutputs([]);
    setResult(null);
    setErrorMessage(null);
  };

  const extractSectionContent = (text: string, sectionName: string) => {
    // Split the text into paragraphs
    const paragraphs = text.split("\n");
    let foundSection = false;
    let sectionContent: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];

      // Check if this is the start of our target section
      if (paragraph.toLowerCase().includes(sectionName.toLowerCase())) {
        foundSection = true;
        continue;
      }

      // If we found our section and hit the next heading, stop
      if (
        foundSection &&
        paragraphs[i + 1]?.toLowerCase().includes("heading")
      ) {
        break;
      }

      // If we're in our target section, collect the content
      if (foundSection && paragraph.trim()) {
        sectionContent.push(paragraph);
      }
    }

    if (!foundSection) {
      console.log(`❌ Could not find section "${sectionName}"`);
      return "";
    }

    const content = sectionContent.join("\n").trim();
    console.log(`📋 Extracted Section "${sectionName}":`, content);
    return content;
  };

  if (status === "loading") {
    return <p>Loading session...</p>;
  }

  if (!session) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Brag Sheet AI Assistant</h1>
        <button onClick={() => signIn("google")}>Sign in with Google</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Brag Sheet AI Assistant</h1>
      <p>Signed in as {session.user?.email}</p>
      <button onClick={() => signOut()} style={{ marginBottom: 20 }}>
        Sign out
      </button>

      <div style={{ marginTop: 20 }}>
        <input
          type="text"
          placeholder="Paste your Google Doc URL here"
          value={docUrl}
          onChange={(e) => setDocUrl(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
        <button onClick={handleLoadDoc} style={{ marginTop: 10 }}>
          📄 Load Document
        </button>
      </div>

      {fetchingDoc && <Spinner />}

      {!fetchingDoc && docRetrieved && (
        <p style={{ color: "green", marginTop: 20 }}>
          ✅ Google Doc retrieved successfully!
        </p>
      )}

      {docRetrieved && headings.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <label
            htmlFor="section-select"
            style={{ display: "block", marginBottom: 8 }}
          >
            Select Section:
          </label>
          <select
            id="section-select"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            style={{ padding: 8, width: "100%" }}
          >
            {headings.map((heading) => (
              <option key={heading} value={heading}>
                {heading}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <label
          htmlFor="model-select"
          style={{ display: "block", marginBottom: 8 }}
        >
          Select Model:
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{ padding: 8, width: "100%" }}
        >
          {Object.entries(SUPPORTED_MODELS).map(([key, description]) => (
            <option key={key} value={key}>
              {key} - {description}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button
          onClick={generate}
          disabled={!docRetrieved || loading}
          style={{ flex: 1 }}
        >
          {loading ? "✨ Generating..." : "✨ Generate with Selected Model"}
        </button>

        <button
          onClick={clearOutputs}
          disabled={loading || modelOutputs.length === 0}
          style={{
            backgroundColor: "#ff4444",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px"
          }}
        >
          🗑️ Clear All Outputs
        </button>
      </div>

      {loading && <Spinner label="✨ Generating AI output..." />}
      {loading && (
        <div style={{ marginTop: 20 }}>
          <p style={{ marginTop: 10 }}>
            ⏱️ Elapsed Time: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
          </p>
        </div>
      )}

      {errorMessage && (
        <p style={{ color: "red", marginTop: 20 }}>{errorMessage}</p>
      )}

      {modelOutputs.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>Model Outputs:</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {modelOutputs.map((output, index) => (
              <div
                key={index}
                style={{
                  padding: 20,
                  borderRadius: 8,
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ddd"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    color: "#666"
                  }}
                >
                  <strong>🤖 {output.model}</strong>
                  <div style={{ display: "flex", gap: 15 }}>
                    <span>⏰ {output.timestamp}</span>
                    <span>⏱️ {output.elapsedTime}</span>
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word"
                  }}
                >
                  {output.output}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
