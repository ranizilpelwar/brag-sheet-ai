import React, { useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Spinner from "./components/Spinner";
import { staticInstructions } from "../utils/buildPrompt";
import fs from "fs";

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
  const generate = async () => {
    try {
      setLoading(true);
      setResult(null);

      // Find the "Delivery Wins / What You Built" section
      const deliveryWinsIndex = items.findIndex(
        (item) =>
          item.toLowerCase().includes("delivery wins") ||
          item.toLowerCase().includes("what you built")
      );

      console.log("🔍 All items:", items);
      console.log("🔍 Found section at index:", deliveryWinsIndex);

      if (deliveryWinsIndex === -1) {
        throw new Error(
          "Could not find 'Delivery Wins / What You Built' section in the document"
        );
      }

      // Get the section content
      const deliveryWinsSection = items[deliveryWinsIndex];
      console.log("🔍 Extracted section content:", deliveryWinsSection);

      // Start stopwatch
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      // Generate summary using Ollama
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: deliveryWinsSection,
          provider: "ollama"
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

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

      <button
        onClick={generate}
        style={{ marginTop: 40 }}
        disabled={!docRetrieved || loading}
      >
        {loading ? "✨ Generating..." : "✨ Generate Polished Output"}
      </button>

      {loading && <Spinner label="✨ Generating AI output..." />}
      {loading && (
        <div style={{ marginTop: 20 }}>
          {batchProgress > 0 && (
            <p>
              ⏳ Processing batch {batchProgress} of {totalBatches}...
            </p>
          )}
          {batchProgress === 0 && <p>⏳ Preparing generation...</p>}
          <p style={{ marginTop: 10 }}>
            ⏱️ Elapsed Time: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
          </p>
          {errorMessage && (
            <p style={{ color: "red", marginTop: 20 }}>{errorMessage}</p>
          )}
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: 30 }}>
          <h2>AI Output:</h2>
          <pre>{result}</pre>
        </div>
      )}
    </main>
  );
}
