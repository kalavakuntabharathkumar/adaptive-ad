import { useState } from "react";
import { adSpec } from "./spec";
import { surfaces } from "./surfaces";
import { resolveLayout } from "./resolver";
import { renderAdToDom } from "./render-dom";
import "./App.css";

type SurfaceName = keyof typeof surfaces;

const surfaceLabels: Record<SurfaceName, string> = {
  mobilePortrait: "Mobile Portrait",
  mobileLandscape: "Mobile Landscape",
  broadcastLowerThird: "Broadcast Lower Third",
  retailKiosk: "Square Kiosk",
  constraintTest: "Constraint Test",
};

function App() {
  const [selectedSurface, setSelectedSurface] =
    useState<SurfaceName>("mobilePortrait");

  const surface = surfaces[selectedSurface];
  const resolvedLayout = resolveLayout(adSpec.elements, surface);

  const visibleCount = resolvedLayout.elements.filter(
    (element) => element.visible
  ).length;

  const hiddenCount = resolvedLayout.elements.length - visibleCount;

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">CONSTRAINT-BASED UI SYSTEM</div>
          <h1>Adaptive Layout Engine</h1>
          <p>One advertisement. Every surface. One resolution algorithm.</p>
        </div>

        <div className="engine-status">
          <span className="status-dot" />
          Resolver Active
        </div>
      </header>

      <section className="surface-picker">
        <div className="picker-heading">
          <span>SELECT SURFACE</span>
          <small>Same AdSpec → New Resolution</small>
        </div>

        <div className="surface-options">
          {(Object.keys(surfaceLabels) as SurfaceName[]).map((name) => (
            <button
              key={name}
              className={`surface-option ${
                selectedSurface === name ? "active" : ""
              }`}
              onClick={() => setSelectedSurface(name)}
            >
              <span className="surface-icon">
                {name === "mobilePortrait" && "▯"}
                {name === "mobileLandscape" && "▭"}
                {name === "broadcastLowerThird" && "▰"}
                {name === "retailKiosk" && "□"}
                {name === "constraintTest" && "!"}
              </span>

              <span>
                <strong>{surfaceLabels[name]}</strong>
                <small>
                  {surfaces[name].width} × {surfaces[name].height}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard">
        <div className="preview-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">LIVE PREVIEW</span>
              <h2>{surfaceLabels[selectedSurface]}</h2>
            </div>

            <span className="dimension-badge">
              {surface.width} × {surface.height}
            </span>
          </div>

          <div className="preview-stage">
            <div
              className="surface"
              style={{
                aspectRatio: `${surface.width} / ${surface.height}`,
              }}
            >
              {renderAdToDom(adSpec, resolvedLayout, surface)}
            </div>
          </div>
        </div>

        <aside className="info-panel">
          <div className="info-card highlight">
            <span className="panel-label">RESOLUTION</span>

            <div className="resolution-number">
              {visibleCount}
              <span>/ {resolvedLayout.elements.length}</span>
            </div>

            <p>elements currently visible</p>

            {hiddenCount > 0 && (
              <div className="degradation-alert">
                <span>!</span>
                {hiddenCount} element{hiddenCount > 1 ? "s" : ""} degraded
              </div>
            )}
          </div>

          <div className="info-card">
            <span className="panel-label">SURFACE CONSTRAINTS</span>

            <div className="constraint-grid">
              <div>
                <small>Dimensions</small>
                <strong>
                  {surface.width} × {surface.height}
                </strong>
              </div>

              <div>
                <small>Min text</small>
                <strong>{surface.minTextSize ?? "—"} px</strong>
              </div>

              <div>
                <small>Tap target</small>
                <strong>
                  {surface.minTapTarget
                    ? `${surface.minTapTarget}px`
                    : "—"}
                </strong>
              </div>

              <div>
                <small>Viewing</small>
                <strong>{surface.viewingDistance ?? "—"}</strong>
              </div>
            </div>
          </div>

          <div className="info-card">
            <span className="panel-label">RESOLVED ELEMENTS</span>

            <div className="element-list">
              {resolvedLayout.elements.map((element) => (
                <div
                  className={`element-row ${
                    element.visible ? "" : "is-hidden"
                  }`}
                  key={element.id}
                >
                  <span
                    className={`element-dot ${
                      element.visible ? "visible" : "hidden"
                    }`}
                  />

                  <div className="element-name">
                    <strong>{element.id}</strong>
                    <small>
                      {Math.round(element.box.width)} ×{" "}
                      {Math.round(element.box.height)}
                    </small>
                  </div>

                  <span className="element-state">
                    {element.visible ? "VISIBLE" : "HIDDEN"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="architecture-strip">
        <div>
          <span className="panel-label">RESOLUTION PIPELINE</span>

          <div className="pipeline">
            <span>AdSpec</span>
            <b>→</b>
            <span>Surface Profile</span>
            <b>→</b>
            <span>Constraint Resolver</span>
            <b>→</b>
            <span>Resolved Layout</span>
            <b>→</b>
            <span>Renderer</span>
          </div>
        </div>

        <div className="architecture-note">
          <span>✓</span>
          No surface-specific layout code
        </div>
      </section>
    </main>
  );
}

export default App;