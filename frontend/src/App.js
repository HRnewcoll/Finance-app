import React, { useState } from "react";
import "./App.css";
import ColorContrast from "./components/ColorContrast";
import AriaValidator from "./components/AriaValidator";
import ImageDescriber from "./components/ImageDescriber";

const TOOLS = [
  {
    id: "home",
    label: "Home",
  },
  {
    id: "color-contrast",
    label: "Colour Contrast",
  },
  {
    id: "aria-validator",
    label: "ARIA Validator",
  },
  {
    id: "image-describer",
    label: "Image Describer",
  },
];

function HomePage({ onNavigate }) {
  const cards = [
    {
      id: "color-contrast",
      icon: "🎨",
      title: "Colour Contrast Checker",
      desc: "Check and fix foreground/background contrast ratios against WCAG AA & AAA standards.",
    },
    {
      id: "aria-validator",
      icon: "✅",
      title: "ARIA Validator",
      desc: "Paste HTML and get instant feedback on missing labels, roles, landmarks, and more.",
    },
    {
      id: "image-describer",
      icon: "🖼️",
      title: "Image Describer",
      desc: "Upload an image to get metadata, orientation, and alt-text writing suggestions.",
    },
  ];
  return (
    <section aria-labelledby="home-heading">
      <h1 id="home-heading" className="page-title">Accessibility Mini-Apps</h1>
      <p className="page-desc">
        A suite of developer tools that help you build more inclusive interfaces.
        Choose a tool below to get started.
      </p>
      <div className="home-grid">
        {cards.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="home-card"
            onClick={(e) => { e.preventDefault(); onNavigate(c.id); }}
          >
            <div className="card-icon" aria-hidden="true">{c.icon}</div>
            <h2>{c.title}</h2>
            <p>{c.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState("home");

  const renderPage = () => {
    switch (page) {
      case "color-contrast": return <ColorContrast />;
      case "aria-validator":  return <AriaValidator />;
      case "image-describer": return <ImageDescriber />;
      default:                return <HomePage onNavigate={setPage} />;
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header>
        <div className="header-inner">
          <h1>♿ A11y Tools</h1>
          <nav aria-label="Main navigation">
            {TOOLS.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={page === t.id ? "active" : ""}
                aria-current={page === t.id ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); setPage(t.id); }}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {renderPage()}
      </main>
    </>
  );
}
