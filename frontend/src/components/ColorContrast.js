import React, { useState } from "react";

export default function ColorContrast() {
  const [fg, setFg]           = useState("#333333");
  const [bg, setBg]           = useState("#ffffff");
  const [target, setTarget]   = useState("AA");
  const [result, setResult]   = useState(null);
  const [fixed, setFixed]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setFixed(null);
    try {
      const res = await fetch("/api/color-contrast/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foreground: fg, background: bg }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFix() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/color-contrast/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foreground: fg, background: bg, target }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
      setFixed(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const badgeClass = (level) => {
    if (level === "AAA")      return "badge badge-pass";
    if (level === "AA")       return "badge badge-pass";
    if (level === "AA Large") return "badge badge-warn";
    return "badge badge-fail";
  };

  const displayFg = fixed ? fixed.suggested_foreground : fg;
  const displayBg = bg;

  return (
    <section aria-labelledby="cc-heading">
      <h1 id="cc-heading" className="page-title">🎨 Colour Contrast Checker</h1>
      <p className="page-desc">
        Enter foreground and background colours to check their WCAG contrast ratio, or
        let the tool automatically suggest a fix.
      </p>

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="field">
            <label htmlFor="fg-picker">Foreground colour</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                id="fg-picker"
                type="color"
                value={fg}
                onChange={(e) => { setFg(e.target.value); setResult(null); setFixed(null); }}
                style={{ width: "56px", flexShrink: 0 }}
                aria-label="Foreground colour picker"
              />
              <input
                type="text"
                value={fg}
                onChange={(e) => { setFg(e.target.value); setResult(null); setFixed(null); }}
                maxLength={7}
                aria-label="Foreground hex value"
                placeholder="#333333"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="bg-picker">Background colour</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                id="bg-picker"
                type="color"
                value={bg}
                onChange={(e) => { setBg(e.target.value); setResult(null); setFixed(null); }}
                style={{ width: "56px", flexShrink: 0 }}
                aria-label="Background colour picker"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => { setBg(e.target.value); setResult(null); setFixed(null); }}
                maxLength={7}
                aria-label="Background hex value"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="target-select">Fix target level</label>
          <select
            id="target-select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="AA">AA (4.5 : 1)</option>
            <option value="AAA">AAA (7 : 1)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={handleCheck} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : null}
            Check contrast
          </button>
          <button className="btn btn-secondary" onClick={handleFix} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : null}
            Auto-fix to {target}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Live preview */}
      <div className="card" aria-live="polite" aria-label="Preview">
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Live preview</p>
        <div
          className="preview-text"
          style={{ color: displayFg, backgroundColor: displayBg }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
        {fixed && (
          <p className="alert alert-info" style={{ marginTop: 12 }}>
            Suggested foreground changed from{" "}
            <code>{fixed.original_foreground}</code> →{" "}
            <strong>{fixed.suggested_foreground}</strong>
          </p>
        )}
      </div>

      {result && !fixed && (
        <div className="card" aria-live="polite">
          <p style={{ marginBottom: 12, fontWeight: 600 }}>Results</p>
          <table className="meta-table" aria-label="Contrast check results">
            <tbody>
              <tr>
                <th scope="row">Contrast ratio</th>
                <td><strong>{result.contrast_ratio} : 1</strong></td>
              </tr>
              <tr>
                <th scope="row">WCAG level</th>
                <td><span className={badgeClass(result.wcag_level)}>{result.wcag_level}</span></td>
              </tr>
              <tr>
                <th scope="row">Passes AA (4.5 : 1)</th>
                <td>{result.passes_aa ? "✅ Yes" : "❌ No"}</td>
              </tr>
              <tr>
                <th scope="row">Passes AAA (7 : 1)</th>
                <td>{result.passes_aaa ? "✅ Yes" : "❌ No"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {fixed && (
        <div className="card" aria-live="polite">
          <p style={{ marginBottom: 12, fontWeight: 600 }}>Fixed result</p>
          <table className="meta-table" aria-label="Fixed contrast results">
            <tbody>
              <tr>
                <th scope="row">Suggested foreground</th>
                <td><code>{fixed.suggested_foreground}</code></td>
              </tr>
              <tr>
                <th scope="row">Background</th>
                <td><code>{fixed.background}</code></td>
              </tr>
              <tr>
                <th scope="row">Contrast ratio</th>
                <td><strong>{fixed.contrast_ratio} : 1</strong></td>
              </tr>
              <tr>
                <th scope="row">WCAG level</th>
                <td><span className={badgeClass(fixed.wcag_level)}>{fixed.wcag_level}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
