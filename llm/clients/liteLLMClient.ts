export const createLiteLLMClient = () => ({
  generate: async ({ prompt }: { prompt: string }) => {
    const res = await fetch("http://localhost:4000/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk-..."
      },
      body: JSON.stringify({
        model: "llama2",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content;
  }
});
