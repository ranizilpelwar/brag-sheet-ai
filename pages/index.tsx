import React, { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const dummyItems = [
  "fixed bugs in the dashboard",
  "helped team estimate sprint work",
  "led migration to new CI pipeline"
];

export default function Home() {
  const { data: session, status } = useSession();
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const generate = async () => {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: dummyItems, tone: "Professional" })
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

      <p>Using dummy work notes:</p>
      <ul>
        {dummyItems.map((item, idx) => (
          <li key={idx}>• {item}</li>
        ))}
      </ul>

      <button onClick={generate} style={{ marginTop: 20 }}>
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
