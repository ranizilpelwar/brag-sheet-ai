import React, { useState, useRef } from "react";
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
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("mistral");
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([]);

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
      setLoading(true);
      setErrorMessage(null);
      setElapsedTime(0);

      // Extract the delivery wins section from all items
      const deliveryWinsSection = extractDeliveryWinsSection(items.join("\n"));

      if (!deliveryWinsSection) {
        throw new Error(
          "Could not find 'Delivery Wins / What You Built' section in the document"
        );
      }

      // Start stopwatch
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      // Generate summary using selected model
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: deliveryWinsSection,
          provider: "litellm",
          model: selectedModel
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      // Format elapsed time
      const minutes = Math.floor(elapsedTime / 60);
      const seconds = elapsedTime % 60;
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const clearOutputs = () => {
    setModelOutputs([]);
    setResult(null);
    setErrorMessage(null);
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
