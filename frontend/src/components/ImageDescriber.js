import React, { useState, useRef } from "react";

export default function ImageDescriber() {
  const [preview, setPreview]   = useState(null);
  const [filename, setFilename] = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef(null);

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setFilename(file.name);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e) {
    readFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragover(false);
    readFile(e.dataTransfer.files[0]);
  }

  async function handleDescribe() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/image/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: preview, filename }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="img-heading">
      <h1 id="img-heading" className="page-title">🖼️ Image Describer</h1>
      <p className="page-desc">
        Upload an image to get its metadata, orientation, transparency status, and
        suggestions for writing effective alt text.
      </p>

      <div className="card">
        {/* Dropzone */}
        <div
          className={`dropzone${dragover ? " dragover" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Upload image — click or drag and drop"
          onClick={() => fileRef.current.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
        >
          <span aria-hidden="true" style={{ fontSize: "2.5rem" }}>📁</span>
          <p>Click to choose an image, or drag and drop here</p>
          <p style={{ fontSize: "0.8rem", marginTop: 4 }}>PNG, JPEG, GIF, WebP supported</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
          aria-label="Image file input"
        />

        {preview && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <img
              src={preview}
              alt={filename ? `Preview of ${filename}` : "Uploaded image preview"}
              style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, border: "2px solid #c8cfe4" }}
            />
            <p style={{ fontSize: "0.85rem", color: "#555", marginTop: 6 }}>{filename}</p>
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={handleDescribe}
          disabled={!preview || loading}
        >
          {loading ? <><span className="spinner" aria-hidden="true" /> Analysing…</> : "Describe image"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="card" aria-live="polite">
          <p style={{ fontWeight: 600, marginBottom: 12 }}>Image metadata</p>
          <table className="meta-table" aria-label="Image metadata">
            <tbody>
              <tr><th scope="row">Format</th><td>{result.format}</td></tr>
              <tr><th scope="row">Dimensions</th><td>{result.width} × {result.height} px</td></tr>
              <tr><th scope="row">Colour mode</th><td>{result.mode}</td></tr>
              <tr><th scope="row">Transparency</th><td>{result.has_transparency ? "Yes" : "No"}</td></tr>
              <tr>
                <th scope="row">Estimated alt text</th>
                <td><em>"{result.estimated_alt_text}"</em></td>
              </tr>
            </tbody>
          </table>

          {result.suggestions.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginTop: 20, marginBottom: 10 }}>💡 Suggestions</p>
              <ul style={{ paddingLeft: 20 }}>
                {result.suggestions.map((s, i) => (
                  <li key={i} style={{ marginBottom: 8, fontSize: "0.92rem" }}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
