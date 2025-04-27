import React, { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Spinner from "./components/Spinner";

export default function Home() {
  const { data: session, status } = useSession();
  const [docUrl, setDocUrl] = useState<string>("");
  const [docId, setDocId] = useState<string>("");
  const [items, setItems] = useState<string[]>([]);
  const [docRetrieved, setDocRetrieved] = useState<boolean>(false);
  const [fetchingDoc, setFetchingDoc] = useState<boolean>(false); // <-- NEW loading state
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

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

  const generate = async () => {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, tone: "Professional" })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error occurred");
      }

      setResult(data.output);
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
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

      {loading && (
        <div style={{ marginTop: 20 }}>
          <p>⏳ Please wait while the AI generates...</p>
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
