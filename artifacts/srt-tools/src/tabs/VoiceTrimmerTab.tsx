import { useState } from "react";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import UploadBox from "@/tabs/trimmer/UploadBox";
import AudioCard from "@/tabs/trimmer/AudioCard";
import DownloadPanel from "@/tabs/trimmer/DownloadPanel";
import { Scissors, Trash2 } from "lucide-react";

type SplitStage = "idle" | "preview" | "trimming" | "done";

export default function VoiceTrimmerTab() {
  const { audioFiles, addFiles, removeFile, trimAllFiles, resetTrim } = useAudioAnalysis();
  const [splitStage, setSplitStage] = useState<SplitStage>("idle");

  const readyCount = audioFiles.filter((f) => f.status === "ready" && !f.isTrimmed).length;
  const trimmedCount = audioFiles.filter((f) => f.isTrimmed).length;

  const handleSplitClick = async () => {
    if (splitStage === "idle") {
      setSplitStage("preview");
    } else if (splitStage === "preview") {
      setSplitStage("trimming");
      await trimAllFiles();
      setSplitStage("done");
    }
  };

  const handleClear = () => {
    resetTrim();
    setSplitStage("idle");
    audioFiles.forEach((f) => removeFile(f.id));
  };

  const splitLabel =
    splitStage === "idle" ? "Split" :
    splitStage === "preview" ? "Confirm Cut" :
    splitStage === "trimming" ? "Processing…" : "Split";

  const splitDisabled = splitStage === "trimming" || readyCount === 0;

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-5 flex flex-col gap-3">
      <UploadBox onFiles={addFiles} />

      {/* Controls bar */}
      <div className="rounded-xl flex items-center justify-between px-5 py-3" style={{
        background: "white",
        border: "1px solid hsl(220,15%,90%)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <div>
          {audioFiles.length === 0 ? (
            <p className="text-xs" style={{ color: "hsl(220,10%,62%)" }}>Upload files to enable controls</p>
          ) : splitStage === "done" ? (
            <p className="text-xs" style={{ color: "hsl(185,65%,34%)" }}>
              ✓ {trimmedCount} file{trimmedCount !== 1 ? "s" : ""} trimmed — download each below
            </p>
          ) : splitStage === "preview" ? (
            <p className="text-xs" style={{ color: "hsl(220,10%,45%)" }}>
              {readyCount} file{readyCount !== 1 ? "s" : ""} ready to cut — click Confirm Cut to proceed
            </p>
          ) : (
            <p className="text-xs" style={{ color: "hsl(220,10%,55%)" }}>
              {audioFiles.length} file{audioFiles.length !== 1 ? "s" : ""} loaded — {readyCount} ready to trim
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            disabled={audioFiles.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ background: "hsl(220,15%,94%)", color: "hsl(220,20%,40%)" }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = "rgba(239,68,68,0.10)";
                e.currentTarget.style.color = "#ef4444";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "hsl(220,15%,94%)";
              e.currentTarget.style.color = "hsl(220,20%,40%)";
            }}
          >
            <Trash2 className="w-3 h-3" /> Clear All
          </button>
          {splitStage !== "done" && (
            <button
              onClick={handleSplitClick}
              disabled={splitDisabled}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: splitStage === "preview" ? "hsl(185,65%,30%)" : "hsl(185,65%,36%)",
                color: "white",
                boxShadow: splitStage === "preview"
                  ? "0 0 0 2px hsl(185,65%,70%)"
                  : "0 1px 4px rgba(15,160,155,0.25)",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.background = "hsl(185,65%,28%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = splitStage === "preview"
                  ? "hsl(185,65%,30%)"
                  : "hsl(185,65%,36%)";
              }}
            >
              <Scissors className="w-3 h-3" /> {splitLabel}
            </button>
          )}
        </div>
      </div>

      {/* Audio Cards */}
      {audioFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          {audioFiles.map((audio) => (
            <AudioCard
              key={audio.id}
              audio={audio}
              onRemove={removeFile}
              splitStage={splitStage}
            />
          ))}
        </div>
      )}

      {/* Download Panel */}
      {splitStage === "done" && <DownloadPanel files={audioFiles} />}
    </div>
  );
}
