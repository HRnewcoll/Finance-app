import React, { useState } from "react";

const SAMPLE_HTML = `<html>
<body>
  <header>
    <h1>My Page</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <!-- Issues introduced for demonstration -->
  <img src="hero.jpg" />
  <button></button>
  <input type="text" />
  <div role="badRole">Widget</div>
</body>
</html>`;

export default function AriaValidator() {
  const [html, setHtml]       = useState(SAMPLE_HTML);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function handleValidate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/aria/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const severityIcon = (s) => (s === "error" ? "🔴" : "🟡");

  return (
    <section aria-labelledby="aria-heading">
      <h1 id="aria-heading" className="page-title">✅ ARIA Validator</h1>
      <p className="page-desc">
        Paste your HTML below and click <strong>Validate</strong> to check for common
        accessibility issues such as missing alt text, unlabelled inputs, empty buttons,
        invalid roles, and missing landmarks.
      </p>

      <div className="card">
        <div className="field">
          <label htmlFor="html-input">HTML to validate</label>
          <textarea
            id="html-input"
            value={html}
            onChange={(e) => { setHtml(e.target.value); setResult(null); }}
            spellCheck={false}
            aria-describedby="html-hint"
          />
          <p id="html-hint" style={{ fontSize: "0.82rem", color: "#666", marginTop: 4 }}>
            Paste a complete page or a snippet.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleValidate} disabled={loading}>
          {loading ? <><span className="spinner" aria-hidden="true" /> Validating…</> : "Validate"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="card" aria-live="polite" aria-atomic="true">
          {result.passed ? (
            <div className="alert alert-success" role="status">
              🎉 No issues found — your HTML looks great!
            </div>
          ) : (
            <>
              <div className="alert alert-warning" role="status">
                Found <strong>{result.issue_count}</strong>{" "}
                issue{result.issue_count !== 1 ? "s" : ""}
              </div>
              <ul className="issue-list" aria-label="Accessibility issues">
                {result.issues.map((issue, i) => (
                  <li key={i} className="issue-item">
                    <span className="issue-icon" aria-hidden="true">
                      {severityIcon(issue.severity)}
                    </span>
                    <div className="issue-body">
                      <span className="issue-rule">{issue.rule}</span>
                      <p className="issue-message">{issue.message}</p>
                      <code className="issue-element">{issue.element}</code>
                    </div>
                    <span className="badge" style={{ alignSelf: "flex-start" }}
                      aria-label={`Severity: ${issue.severity}`}>
                      {issue.severity}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
