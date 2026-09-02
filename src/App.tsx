import {
  useMemo,
  useState,
} from "react";

import type {
  ChangeEvent,
} from "react";

import {
  adSpec,
  type AdElement,
  type AdSpec,
} from "./spec";

import { surfaces } from "./surfaces";
import { resolveLayout } from "./resolver";
import { renderAdToDom } from "./render-dom";

import "./App.css";

type SurfaceName = keyof typeof surfaces;

const surfaceLabels: Record<
  SurfaceName,
  string
> = {
  mobilePortrait: "Mobile Portrait",
  mobileLandscape: "Mobile Landscape",
  broadcastLowerThird: "Broadcast Lower Third",
  retailKiosk: "Square Kiosk",
};

const MAX_HEADLINE_CHARS = 30;
const MAX_PRODUCT_NAME_CHARS = 24;

type Ad = AdSpec & {
  id: string;
  name: string;
};

type EditableElement = {
  id: string;
  content: string;
};

function cloneElements(
  elements: AdElement[]
): AdElement[] {
  return elements.map((element) => ({
    ...element,
  }));
}

function createAd(
  id: string,
  name: string,
  elements: AdElement[]
): Ad {
  return {
    id,
    name,
    elements: cloneElements(elements),
  };
}

function App() {
  const [ads, setAds] = useState<Ad[]>([
    createAd(
      "ad-1",
      "Default Advertisement",
      adSpec.elements
    ),
  ]);

  const [selectedAdId, setSelectedAdId] =
    useState("ad-1");

  const [selectedSurface, setSelectedSurface] =
    useState<SurfaceName>(
      "mobilePortrait"
    );

  const [draftName, setDraftName] =
    useState(
      "Default Advertisement"
    );

  const [draftElements, setDraftElements] =
    useState<EditableElement[]>(
      adSpec.elements.map((element) => ({
        id: element.id,
        content: element.content,
      }))
    );

  const selectedAd = useMemo(
    () =>
      ads.find(
        (ad) =>
          ad.id === selectedAdId
      ) ?? ads[0],
    [ads, selectedAdId]
  );

  const surface =
    surfaces[selectedSurface];

  const resolvedLayout = selectedAd
    ? resolveLayout(
        selectedAd.elements,
        surface
      )
    : { elements: [] };

  const visibleCount =
    resolvedLayout.elements.filter(
      (element) =>
        element.visible
    ).length;

  const hiddenCount =
    resolvedLayout.elements.length -
    visibleCount;

  function loadAdIntoEditor(
    ad: Ad
  ) {
    setDraftName(ad.name);

    setDraftElements(
      ad.elements.map(
        (element) => ({
          id: element.id,
          content:
            element.content,
        })
      )
    );
  }

  function selectAd(
    adId: string
  ) {
    const ad = ads.find(
      (item) =>
        item.id === adId
    );

    if (!ad) {
      return;
    }

    setSelectedAdId(adId);
    loadAdIntoEditor(ad);
  }

  function updateElementContent(
    elementId: string,
    content: string
  ) {
    setDraftElements(
      (current) =>
        current.map(
          (element) =>
            element.id ===
            elementId
              ? {
                  ...element,
                  content,
                }
              : element
        )
    );
  }

  function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    elementId: string
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      window.alert(
        "Please select an image file."
      );

      event.target.value = "";
      return;
    }

    const imageUrl =
      URL.createObjectURL(file);

    updateElementContent(
      elementId,
      imageUrl
    );

    event.target.value = "";
  }

  function applyAdvertisement() {
    if (!selectedAd) {
      return;
    }

    const updatedElements =
      selectedAd.elements.map(
        (element) => {
          const draft =
            draftElements.find(
              (item) =>
                item.id ===
                element.id
            );

          return {
            ...element,
            content:
              draft?.content ??
              element.content,
          };
        }
      );

    const updatedAd: Ad = {
      ...selectedAd,

      name:
        draftName.trim() ||
        "Untitled Advertisement",

      elements:
        updatedElements,
    };

    setAds(
      (currentAds) =>
        currentAds.map(
          (ad) =>
            ad.id ===
            selectedAd.id
              ? updatedAd
              : ad
        )
    );

    setDraftName(
      updatedAd.name
    );

    setDraftElements(
      updatedAd.elements.map(
        (element) => ({
          id: element.id,
          content:
            element.content,
        })
      )
    );
  }

  function resetEditor() {
    if (!selectedAd) {
      return;
    }

    loadAdIntoEditor(
      selectedAd
    );
  }

  function addAd() {
    const source =
      selectedAd ?? adSpec;

    const newAd: Ad = {
      ...source,

      id: `ad-${Date.now()}`,

      name:
        `Advertisement ${
          ads.length + 1
        }`,

      elements:
        cloneElements(
          source.elements
        ),
    };

    setAds(
      (currentAds) => [
        ...currentAds,
        newAd,
      ]
    );

    setSelectedAdId(
      newAd.id
    );

    loadAdIntoEditor(
      newAd
    );
  }

  function deleteAd() {
    if (
      !selectedAd ||
      ads.length === 1
    ) {
      return;
    }

    const remainingAds =
      ads.filter(
        (ad) =>
          ad.id !==
          selectedAd.id
      );

    const nextAd =
      remainingAds[0];

    setAds(
      remainingAds
    );

    setSelectedAdId(
      nextAd.id
    );

    loadAdIntoEditor(
      nextAd
    );
  }

  if (!selectedAd) {
    return null;
  }

  return (
    <main
      className="app-shell"
      style={{
        gridTemplateColumns:
          "260px minmax(0, 1fr)",
      }}
    >
      <aside
        className="sidebar"
        style={{
          height: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">
            A
          </div>

          <div>
            <strong>
              Adaptive Ad
            </strong>

            <span>
              Layout Engine
            </span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">
            ADVERTISEMENTS
          </div>

          <div className="ad-list">
            {ads.map(
              (ad, index) => (
                <button
                  key={ad.id}
                  className={`ad-item ${
                    selectedAdId ===
                    ad.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    selectAd(
                      ad.id
                    )
                  }
                >
                  <span className="ad-number">
                    {index + 1}
                  </span>

                  <span className="ad-item-content">
                    <strong>
                      {ad.name}
                    </strong>

                    <small>
                      {
                        ad.elements
                          .length
                      }{" "}
                      elements
                    </small>
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        <div
          className="sidebar-actions"
          style={{
            display: "grid",
            gap: "8px",
          }}
        >
          <button
            className="add-ad-button"
            onClick={addAd}
            style={{
              background:
                "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              border:
                "1px solid #818cf8",
              fontWeight: 700,
            }}
          >
            <span>＋</span>
            Add Advertisement
          </button>

          <button
            className="delete-ad-button"
            onClick={deleteAd}
            disabled={
              ads.length === 1
            }
            style={{
              background:
                ads.length === 1
                  ? "transparent"
                  : "rgba(239,68,68,0.12)",
              color:
                ads.length === 1
                  ? undefined
                  : "#f87171",
              border:
                ads.length === 1
                  ? undefined
                  : "1px solid rgba(239,68,68,0.35)",
            }}
          >
            <span>×</span>
            Delete Advertisement
          </button>
        </div>

        <div
          className="sidebar-editor"
          style={{
            marginTop: "22px",
            paddingTop: "18px",
            borderTop:
              "1px solid rgba(148,163,184,0.14)",
          }}
        >
          <div className="sidebar-label">
            ADVERTISEMENT DATA
          </div>

          <div
            style={{
              marginTop: "12px",
              display: "grid",
              gap: "14px",
            }}
          >
            <label
              className="editor-field"
              style={{
                display: "grid",
                gap: "6px",
              }}
            >
              <span>
                Advertisement Name
              </span>

              <input
                type="text"
                value={
                  draftName
                }
                onChange={(
                  event
                ) =>
                  setDraftName(
                    event.target
                      .value
                  )
                }
                placeholder="Advertisement name"
              />
            </label>

            <div
              className="editor-elements"
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {selectedAd.elements.map(
                (element) => {
                  const draft =
                    draftElements.find(
                      (item) =>
                        item.id ===
                        element.id
                    );

                  const value =
                    draft?.content ??
                    element.content;

                  const maxLength =
                    element.id ===
                    "headline"
                      ? MAX_HEADLINE_CHARS
                      : element.id ===
                        "product-name"
                        ? MAX_PRODUCT_NAME_CHARS
                        : undefined;

                  const isLimitedText =
                    element.id ===
                      "headline" ||
                    element.id ===
                      "product-name";

                  return (
                    <div
                      className="editor-element"
                      key={
                        element.id
                      }
                    >
                      <div className="editor-element-header">
                        <div>
                          <strong>
                            {
                              element.id
                            }
                          </strong>

                          <small>
                            {
                              element.type
                            }{" "}
                            ·{" "}
                            {
                              element.role
                            }{" "}
                            · P
                            {
                              element.priority
                            }
                          </small>
                        </div>
                      </div>

                      {element.type ===
                      "image" ? (
                        <div
                          className="image-editor"
                          style={{
                            display:
                              "grid",
                            gap: "7px",
                          }}
                        >
                          <input
                            type="text"
                            value={
                              value
                            }
                            onChange={(
                              event
                            ) =>
                              updateElementContent(
                                element.id,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Image URL"
                          />

                          <label
                            className="upload-button"
                            style={{
                              cursor:
                                "pointer",
                              textAlign:
                                "center",
                            }}
                          >
                            Upload Image

                            <input
                              type="file"
                              accept="image/*"
                              onChange={(
                                event
                              ) =>
                                handleImageUpload(
                                  event,
                                  element.id
                                )
                              }
                              style={{
                                display:
                                  "none",
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={
                            value
                          }
                          minLength={
                            isLimitedText
                              ? 0
                              : undefined
                          }
                          maxLength={
                            maxLength
                          }
                          onChange={(
                            event
                          ) =>
                            updateElementContent(
                              element.id,
                              event
                                .target
                                .value
                            )
                          }
                          placeholder={`Enter ${element.id}`}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "8px",
                marginTop:
                  "4px",
              }}
            >
              <button
                type="button"
                onClick={
                  resetEditor
                }
                style={{
                  background:
                    "rgba(148,163,184,0.10)",
                  color:
                    "#cbd5e1",
                  border:
                    "1px solid rgba(148,163,184,0.22)",
                  borderRadius:
                    "8px",
                  padding:
                    "9px 8px",
                  cursor:
                    "pointer",
                  fontWeight: 600,
                }}
              >
                Reset
              </button>

              <button
                type="button"
                onClick={
                  applyAdvertisement
                }
                style={{
                  background:
                    "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  color:
                    "#ffffff",
                  border:
                    "1px solid #38bdf8",
                  borderRadius:
                    "8px",
                  padding:
                    "9px 8px",
                  cursor:
                    "pointer",
                  fontWeight: 700,
                  boxShadow:
                    "0 6px 18px rgba(59,130,246,0.22)",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />

          <span>
            Resolver Active
          </span>
        </div>
      </aside>

      <div className="app">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              CONSTRAINT-BASED UI SYSTEM
            </div>

            <h1>
              Adaptive Layout Engine
            </h1>

            <p>
              One advertisement. Every
              surface. One resolution
              algorithm.
            </p>
          </div>

          <div className="selected-ad-badge">
            <span>
              ACTIVE AD
            </span>

            <strong>
              {selectedAd.name}
            </strong>
          </div>
        </header>

        <section className="surface-picker">
          <div className="picker-heading">
            <span>
              SELECT SURFACE
            </span>

            <small>
              Same AdSpec → New Resolution
            </small>
          </div>

          <div className="surface-options">
            {(
              Object.keys(
                surfaceLabels
              ) as SurfaceName[]
            ).map(
              (name) => (
                <button
                  key={name}
                  className={`surface-option ${
                    selectedSurface ===
                    name
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedSurface(
                      name
                    )
                  }
                >
                  <span className="surface-icon">
                    {name ===
                      "mobilePortrait" &&
                      "▯"}

                    {name ===
                      "mobileLandscape" &&
                      "▭"}

                    {name ===
                      "broadcastLowerThird" &&
                      "▰"}

                    {name ===
                      "retailKiosk" &&
                      "□"}

                    {name ===
                      "constraintTest" &&
                      "!"}
                  </span>

                  <span>
                    <strong>
                      {
                        surfaceLabels[
                          name
                        ]
                      }
                    </strong>

                    <small>
                      {
                        surfaces[
                          name
                        ].width
                      }{" "}
                      ×{" "}
                      {
                        surfaces[
                          name
                        ].height
                      }
                    </small>
                  </span>
                </button>
              )
            )}
          </div>
        </section>

        <section className="dashboard">
          <div className="preview-panel">
            <div className="panel-header">
              <div>
                <span className="panel-label">
                  LIVE PREVIEW
                </span>

                <h2>
                  {
                    surfaceLabels[
                      selectedSurface
                    ]
                  }
                </h2>
              </div>

              <span className="dimension-badge">
                {surface.width} ×{" "}
                {surface.height}
              </span>
            </div>

            <div
              className="preview-stage"
              style={{
                minHeight:
                  "clamp(320px, 48vw, 620px)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding:
                  "28px",
              }}
            >
              <div
                className="surface"
                style={{
                  aspectRatio: `${surface.width} / ${surface.height}`,
                  width:
                    "min(100%, 1100px)",
                  maxHeight:
                    "620px",
                }}
              >
                {renderAdToDom(
                  selectedAd,
                  resolvedLayout,
                  surface
                )}
              </div>
            </div>
          </div>

          <aside className="info-panel">
            <div className="info-card highlight">
              <span className="panel-label">
                RESOLUTION
              </span>

              <div className="resolution-number">
                {visibleCount}

                <span>
                  /
                  {
                    resolvedLayout
                      .elements
                      .length
                  }
                </span>
              </div>

              <p>
                elements currently visible
              </p>

              {hiddenCount >
                0 && (
                <div className="degradation-alert">
                  <span>
                    !
                  </span>

                  {
                    hiddenCount
                  }{" "}
                  element
                  {hiddenCount >
                  1
                    ? "s"
                    : ""}{" "}
                  degraded
                </div>
              )}
            </div>

            <div className="info-card">
              <span className="panel-label">
                SURFACE CONSTRAINTS
              </span>

              <div className="constraint-grid">
                <div>
                  <small>
                    Dimensions
                  </small>

                  <strong>
                    {
                      surface.width
                    }{" "}
                    ×{" "}
                    {
                      surface.height
                    }
                  </strong>
                </div>

                <div>
                  <small>
                    Min text
                  </small>

                  <strong>
                    {
                      surface.minTextSize ??
                      "—"
                    }{" "}
                    px
                  </strong>
                </div>

                <div>
                  <small>
                    Tap target
                  </small>

                  <strong>
                    {surface.minTapTarget
                      ? `${surface.minTapTarget}px`
                      : "—"}
                  </strong>
                </div>

                <div>
                  <small>
                    Viewing
                  </small>

                  <strong>
                    {
                      surface.viewingDistance ??
                      "—"
                    }
                  </strong>
                </div>
              </div>
            </div>

            <div className="info-card">
              <span className="panel-label">
                RESOLVED ELEMENTS
              </span>

              <div className="element-list">
                {resolvedLayout.elements.map(
                  (element) => (
                    <div
                      className={`element-row ${
                        element.visible
                          ? ""
                          : "is-hidden"
                      }`}
                      key={
                        element.id
                      }
                    >
                      <span
                        className={`element-dot ${
                          element.visible
                            ? "visible"
                            : "hidden"
                        }`}
                      />

                      <div className="element-name">
                        <strong>
                          {
                            element.id
                          }
                        </strong>

                        <small>
                          {Math.round(
                            element
                              .box
                              .width
                          )}{" "}
                          ×{" "}
                          {Math.round(
                            element
                              .box
                              .height
                          )}
                        </small>
                      </div>

                      <span className="element-state">
                        {element.visible
                          ? "VISIBLE"
                          : "HIDDEN"}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="architecture-strip">
          <div>
            <span className="panel-label">
              RESOLUTION PIPELINE
            </span>

            <div className="pipeline">
              <span>
                AdSpec
              </span>

              <b>→</b>

              <span>
                Surface Profile
              </span>

              <b>→</b>

              <span>
                Constraint Resolver
              </span>

              <b>→</b>

              <span>
                Resolved Layout
              </span>

              <b>→</b>

              <span>
                Renderer
              </span>
            </div>
          </div>

          <div className="architecture-note">
            <span>✓</span>

            No surface-specific
            layout code
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
