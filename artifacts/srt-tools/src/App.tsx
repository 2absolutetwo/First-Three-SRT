import { useMemo, useState } from "react";
import { type Subtitle, formatSrt } from "@/lib/srt";
import SrtEditorTab from "@/tabs/SrtEditorTab";
import SrtConverterTab from "@/tabs/SrtConverterTab";
import SrtMakerTab from "@/tabs/SrtMakerTab";
import SrtNoteTab from "@/tabs/SrtNoteTab";
import SrtTimeSplitterTab from "@/tabs/SrtTimeSplitterTab";
import SrtMergerTab from "@/tabs/SrtMergerTab";
import VoiceTrimmerTab from "@/tabs/VoiceTrimmerTab";
import VideoSplitterTab from "@/tabs/VideoSplitterTab";

type Tab = "editor" | "converter" | "maker" | "note" | "splitter" | "merger" | "audio" | "video";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "merger",
    label: "SRT Marger",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: "editor",
    label: "SRT Editor",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "converter",
    label: "SRT Line",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: "maker",
    label: "SRT Maker",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    id: "note",
    label: "SRT Note",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: "splitter",
    label: "SRT Time Spliter",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
  },
  {
    id: "audio",
    label: "Audio Spliter",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    ),
  },
  {
    id: "video",
    label: "Video Spliter",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("merger");
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [filename, setFilename] = useState("");
  const [splitterIncomingKey, setSplitterIncomingKey] = useState(0);

  const hasFile = subtitles.length > 0;

  const incomingSrtForSplitter = useMemo(
    () => (subtitles.length > 0 ? formatSrt(subtitles) : ""),
    [subtitles]
  );

  const handleSelectTab = (id: Tab) => {
    if (id === "splitter" && subtitles.length > 0) {
      setSplitterIncomingKey((k) => k + 1);
    }
    setActiveTab(id);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shrink-0">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 py-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shrink-0">
              <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.5 2.5a2 2 0 00-2-2h-1a2 2 0 00-2 2v1h5v-1zm-5 3v1.5a.5.5 0 01-.5.5H7.5A2.5 2.5 0 005 10v9a2.5 2.5 0 002.5 2.5h9A2.5 2.5 0 0019 19v-9a2.5 2.5 0 00-2.5-2.5H15a.5.5 0 01-.5-.5V5.5h-5z" />
              </svg>
            </div>
            <span className="text-base font-bold text-gray-900">SRT Tools</span>
            {hasFile && (
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                {subtitles.length} subtitles loaded
              </span>
            )}
          </div>

          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-1 px-2 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[1] ?? tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* SRT Maker — always mounted, hidden when inactive */}
      <div style={{ display: activeTab === "maker" ? "flex" : "none" }} className="flex-col flex-1 overflow-y-auto">
        <SrtMakerTab />
      </div>

      {/* SRT Note — always mounted, full width, hidden when inactive */}
      <div style={{ display: activeTab === "note" ? "flex" : "none" }} className="flex-col flex-1 overflow-hidden">
        <SrtNoteTab />
      </div>

      {/* SRT Time Spliter — full width, hidden when inactive */}
      <div style={{ display: activeTab === "splitter" ? "flex" : "none" }} className="flex-col flex-1 overflow-y-auto">
        <SrtTimeSplitterTab
          incomingSrt={incomingSrtForSplitter}
          incomingFilename={filename || "from-editor.srt"}
          incomingKey={splitterIncomingKey}
        />
      </div>

      {/* SRT Marger — full width, hidden when inactive */}
      <div style={{ display: activeTab === "merger" ? "flex" : "none" }} className="flex-col flex-1 overflow-y-auto">
        <SrtMergerTab
          setSubtitles={setSubtitles}
          setFilename={setFilename}
          onGenerated={() => {}}
        />
      </div>

      {/* Audio Spliter — full width, hidden when inactive */}
      <div style={{ display: activeTab === "audio" ? "flex" : "none" }} className="flex-col flex-1 overflow-y-auto">
        <VoiceTrimmerTab />
      </div>

      {/* Video Spliter — full width, hidden when inactive */}
      <div style={{ display: activeTab === "video" ? "flex" : "none" }} className="flex-col flex-1 overflow-y-auto">
        <VideoSplitterTab />
      </div>

      {/* Other tabs */}
      <main
        style={{ display: activeTab === "maker" || activeTab === "note" || activeTab === "splitter" || activeTab === "merger" || activeTab === "audio" || activeTab === "video" ? "none" : "block" }}
        className="max-w-5xl mx-auto px-4 py-5 flex-1 overflow-y-auto w-full"
      >
        {activeTab === "editor" && (
          <SrtEditorTab
            subtitles={subtitles}
            filename={filename}
            setSubtitles={setSubtitles}
            setFilename={setFilename}
            onNext={() => handleSelectTab("converter")}
          />
        )}
        {activeTab === "converter" && (
          <SrtConverterTab
            sharedSubtitles={subtitles}
            sharedFilename={filename}
          />
        )}
      </main>
    </div>
  );
}
