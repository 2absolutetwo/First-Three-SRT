import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Download } from "lucide-react";

const LANGUAGES = [
  { key: "english", label: "English", contentId: "english-content", placeholder: "Write your notes in English...", dir: "ltr" },
  { key: "arabic",  label: "Arabic",  contentId: "arabic-content",  placeholder: "...Write your notes in Arabic",  dir: "rtl" },
  { key: "german",  label: "German",  contentId: "german-content",  placeholder: "Write your notes in German...",  dir: "ltr" },
] as const;

type LangKey = typeof LANGUAGES[number]["key"];

interface Project {
  id: string;
  name: string;
  notes: Record<LangKey, string>;
  createdAt: number;
}

const STORAGE_KEY = "notebook_projects";

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function createProject(name: string): Project {
  return {
    id: Date.now().toString(),
    name,
    notes: { english: "", arabic: "", german: "" },
    createdAt: Date.now(),
  };
}

const COLORS = [
  { label: "Red",   value: "#e53e3e" },
  { label: "Blue",  value: "#3182ce" },
  { label: "Green", value: "#38a169" },
];

export default function SrtNoteTab() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const loaded = loadProjects();
    if (loaded.length === 0) {
      const initial = createProject("New Project");
      saveProjects([initial]);
      return [initial];
    }
    return loaded;
  });

  const [activeId, setActiveId]             = useState<string>(() => {
    const loaded = loadProjects();
    return loaded.length > 0 ? loaded[0].id : "";
  });
  const [search, setSearch]                 = useState("");
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [openMenu, setOpenMenu]             = useState<LangKey | null>(null);
  const [openEdit, setOpenEdit]             = useState<LangKey | null>(null);
  const [findLang, setFindLang]             = useState<LangKey | null>(null);
  const [findQuery, setFindQuery]           = useState("");

  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingName  = useRef(false);
  const contentRefs  = useRef<Partial<Record<LangKey, HTMLDivElement | null>>>({});
  const menuRefs     = useRef<Partial<Record<LangKey, HTMLDivElement | null>>>({});
  const findInputRef = useRef<HTMLInputElement | null>(null);

  const activeProject    = projects.find((p) => p.id === activeId) ?? null;
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      for (const key of Object.keys(menuRefs.current) as LangKey[]) {
        if (menuRefs.current[key]?.contains(e.target as Node)) return;
      }
      setOpenMenu(null);
      setOpenEdit(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (findLang) setTimeout(() => findInputRef.current?.focus(), 50);
    else setFindQuery("");
  }, [findLang]);

  const flushAndSave = useCallback(
    (overrides?: Partial<Record<LangKey, string>>) => {
      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== activeId) return p;
          const notes = { ...p.notes };
          for (const lang of LANGUAGES) {
            const el = contentRefs.current[lang.key];
            if (el) notes[lang.key] = el.innerHTML;
          }
          if (overrides) Object.assign(notes, overrides);
          return { ...p, notes };
        });
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveProjects(updated);
          setSavedIndicator(true);
          setTimeout(() => setSavedIndicator(false), 1500);
        }, 400);
        return updated;
      });
    },
    [activeId]
  );

  useEffect(() => {
    if (!activeProject) return;
    for (const lang of LANGUAGES) {
      const el = contentRefs.current[lang.key];
      if (el) el.innerHTML = activeProject.notes[lang.key] ?? "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const handleInput = useCallback(() => {
    flushAndSave();
  }, [flushAndSave]);

  const handleColorMouseDown = useCallback(
    (e: React.MouseEvent, color: string) => {
      e.preventDefault();
      document.execCommand("foreColor", false, color);
      flushAndSave();
    },
    [flushAndSave]
  );

  const handleH3MouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const fragment = range.extractContents();
      const span = document.createElement("span");
      span.style.fontSize   = "1.35em";
      span.style.fontWeight = "600";
      span.appendChild(fragment);
      range.insertNode(span);
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.addRange(nr);
      flushAndSave();
    },
    [flushAndSave]
  );

  const handleUndo = useCallback((langKey: LangKey) => {
    const el = contentRefs.current[langKey];
    if (!el) return;
    el.focus();
    document.execCommand("undo");
    flushAndSave();
  }, [flushAndSave]);

  const handleCopy = useCallback((langKey: LangKey) => {
    const el = contentRefs.current[langKey];
    if (!el) return;
    navigator.clipboard.writeText(el.innerText ?? "");
  }, []);

  const handleClear = useCallback((langKey: LangKey) => {
    const el = contentRefs.current[langKey];
    if (!el) return;
    el.innerHTML = "";
    flushAndSave({ [langKey]: "" } as Partial<Record<LangKey, string>>);
  }, [flushAndSave]);

  const handleFind = useCallback((query: string) => {
    setFindQuery(query);
    if (!query) return;
    // @ts-ignore
    window.find(query, false, false, true, false, false, false);
  }, []);

  const updateName = useCallback((name: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) => (p.id === activeId ? { ...p, name } : p));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveProjects(updated);
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 1500);
      }, 400);
      return updated;
    });
  }, [activeId]);

  const addProject = () => {
    const project = createProject("New Project");
    const updated = [project, ...projects];
    setProjects(updated);
    saveProjects(updated);
    setActiveId(project.id);
  };

  const exportProject = () => {
    if (!activeProject) return;
    const lines: string[] = [`Project: ${activeProject.name}`, ""];
    for (const lang of LANGUAGES) {
      const el  = contentRefs.current[lang.key];
      const txt = el ? (el.innerText ?? el.textContent ?? "") : activeProject.notes[lang.key];
      lines.push(`--- ${lang.label} ---`);
      lines.push(txt || "(empty)");
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${activeProject.name.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteProject = () => {
    if (!activeProject) return;
    const updated = projects.filter((p) => p.id !== activeId);
    if (updated.length === 0) {
      const fresh = createProject("New Project");
      const withFresh = [fresh];
      setProjects(withFresh);
      saveProjects(withFresh);
      setActiveId(fresh.id);
    } else {
      setProjects(updated);
      saveProjects(updated);
      setActiveId(updated[0].id);
    }
  };

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  return (
    <div className="nb-shell">
      {/* Sidebar */}
      <aside className="nb-sidebar">
        <button className="nb-new-project-btn" onClick={addProject}>
          <Plus size={14} /> New Project
        </button>
        <div className="nb-search-wrapper">
          <Search size={13} className="nb-search-icon" />
          <input
            type="search"
            className="nb-search-input"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ul className="nb-project-list">
          {filteredProjects.length === 0 && (
            <li className="nb-no-projects">No projects found</li>
          )}
          {filteredProjects.map((p) => (
            <li
              key={p.id}
              className={`nb-project-item ${p.id === activeId ? "nb-active" : ""}`}
              onClick={() => setActiveId(p.id)}
            >
              {p.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* Main area */}
      <main className="nb-main-area">
        {activeProject ? (
          <>
            <div className="nb-top-bar">
              <div className="nb-top-bar-left">
                <input
                  className="nb-project-name-input"
                  value={activeProject.name}
                  onChange={(e) => updateName(e.target.value)}
                  onFocus={() => { editingName.current = true; }}
                  onBlur={() => { editingName.current = false; }}
                />
                {savedIndicator && <span className="nb-saved-label">Saved</span>}
              </div>
              <button className="nb-export-btn" onClick={exportProject}>
                <Download size={13} /> Export
              </button>
              <button className="nb-delete-btn" onClick={deleteProject} title="Delete this project">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>

            <div className="nb-columns-wrapper">
              {LANGUAGES.map((lang, i) => (
                <div
                  key={lang.key}
                  className={`nb-lang-column ${i < LANGUAGES.length - 1 ? "nb-has-divider" : ""}`}
                >
                  <div className="nb-lang-header">
                    <span className="nb-lang-label">{lang.label}</span>

                    <div
                      className="nb-menu-wrapper"
                      ref={(el) => { menuRefs.current[lang.key] = el; }}
                    >
                      <button
                        className={`nb-three-dot-btn ${openMenu === lang.key ? "nb-three-dot-btn--active" : ""}`}
                        title="Options"
                        onClick={() => {
                          setOpenMenu((prev) => (prev === lang.key ? null : lang.key));
                          setOpenEdit(null);
                        }}
                      >
                        ···
                      </button>

                      {openMenu === lang.key && (
                        <div className="nb-menu-popup">
                          <div className="nb-menu-item-group">
                            <button
                              className={`nb-menu-item ${openEdit === lang.key ? "nb-menu-item--active" : ""}`}
                              onClick={() =>
                                setOpenEdit((prev) => (prev === lang.key ? null : lang.key))
                              }
                            >
                              ✎ Edit
                            </button>
                            {openEdit === lang.key && (
                              <div className="nb-edit-sub">
                                <span className="nb-dd-label">Color</span>
                                <div className="nb-dd-row">
                                  {COLORS.map((c) => (
                                    <button
                                      key={c.value}
                                      className="nb-color-dot"
                                      style={{ background: c.value }}
                                      title={c.label}
                                      onMouseDown={(e) => handleColorMouseDown(e, c.value)}
                                    />
                                  ))}
                                </div>
                                <div className="nb-dd-divider" />
                                <span className="nb-dd-label">Size</span>
                                <div className="nb-dd-row">
                                  <button
                                    className="nb-size-btn"
                                    onMouseDown={handleH3MouseDown}
                                    title="Larger text"
                                  >
                                    H3
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <button className="nb-menu-item" onClick={() => { handleUndo(lang.key); setOpenMenu(null); }}>
                            ↩ Undo
                          </button>

                          <button className="nb-menu-item" onClick={() => { handleCopy(lang.key); setOpenMenu(null); }}>
                            📑 Copy
                          </button>

                          <button className="nb-menu-item nb-menu-item--danger" onClick={() => { handleClear(lang.key); setOpenMenu(null); }}>
                            ✖ Clear
                          </button>

                          <button
                            className={`nb-menu-item ${findLang === lang.key ? "nb-menu-item--active" : ""}`}
                            onClick={() => {
                              setFindLang((prev) => (prev === lang.key ? null : lang.key));
                              setOpenMenu(null);
                            }}
                          >
                            🔍 Find
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {findLang === lang.key && (
                    <div className="nb-find-bar">
                      <input
                        ref={findInputRef}
                        className="nb-find-input"
                        placeholder="Search in this column..."
                        value={findQuery}
                        onChange={(e) => handleFind(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleFind(findQuery);
                          if (e.key === "Escape") setFindLang(null);
                        }}
                      />
                      <button className="nb-find-close" onClick={() => setFindLang(null)}>✖</button>
                    </div>
                  )}

                  <div
                    id={lang.contentId}
                    className={`nb-content-area ${lang.dir === "rtl" ? "nb-rtl" : ""}`}
                    contentEditable
                    dir={lang.dir}
                    data-placeholder={lang.placeholder}
                    suppressContentEditableWarning
                    ref={(el) => { contentRefs.current[lang.key] = el; }}
                    onInput={handleInput}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="nb-empty-state">
            <p>Select or create a project to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}
