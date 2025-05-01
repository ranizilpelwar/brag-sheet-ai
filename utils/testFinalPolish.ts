import fs from "fs";
import fetch from "node-fetch"; // npm install node-fetch@2

async function runFinalPolishDebug() {
  // Load saved summaries from file
  const summaries = JSON.parse(
    fs.readFileSync("./summaries-debug.json", "utf-8")
  );

  console.log(`✅ Loaded ${summaries.length} saved summaries`);

  // Post summaries to your running Next.js server
  const res = await fetch("http://localhost:8888/api/generate-final-polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summaries,
      tone: "Professional"
    })
  });

  const data = await res.json();

  if (res.ok) {
    console.log("✅ Final polish result received!");
    console.log(data.output);
  } else {
    console.error("❌ Final polish error:", data.error);
  }
}

runFinalPolishDebug();
