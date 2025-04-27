import React from "react";

export default function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
      <div
        style={{
          width: "24px",
          height: "24px",
          border: "4px solid #ccc",
          borderTop: "4px solid #333",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}
      />
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <span style={{ marginLeft: 10 }}>{label}</span>
    </div>
  );
}
