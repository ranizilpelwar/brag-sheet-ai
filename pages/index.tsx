import React, { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [docRetrieved, setDocRetrieved] = useState<boolean>(false);
  useEffect(() => {
    if (session) {
      fetchDoc();
    }
  }, [session]);
  const fetchDoc = async () => {
    const docId = "1YuQCsFIjntoTts6U-3rs5WAs9bJGPtxC8C-bp917tLE";

    const res = await fetch(`/api/fetch-doc?docId=${docId}`, {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (data.paragraphs && data.paragraphs.length > 0) {
      setItems(data.paragraphs);
      setDocRetrieved(true);
    } else {
      console.error("No paragraphs found in document");
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

      {docRetrieved ? (
        <p style={{ color: "green", marginTop: 20 }}>
          ✅ Google Doc retrieved successfully!
        </p>
      ) : (
        <p style={{ color: "gray", marginTop: 20 }}>
          Loading your Google Doc...
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
