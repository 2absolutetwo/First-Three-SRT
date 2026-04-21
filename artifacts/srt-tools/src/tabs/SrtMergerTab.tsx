import { useState, useRef, useCallback } from "react";
import { Upload, Download, Sparkles, X, ChevronUp, ChevronDown, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SRTEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

function parseSRT(content: string): SRTEntry[] {
  const blocks = content.trim().split(/\n\s*\n/);
  const entries: SRTEntry[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;
    const indexLine = lines[0].trim();
    const timeLine = lines[1].trim();
    const textLines = lines.slice(2).join("\n").trim();
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    );
    if (!timeMatch) continue;
    entries.push({
      index: parseInt(indexLine, 10) || entries.length + 1,
      startTime: timeMatch[1].replace(".", ","),
      endTime: timeMatch[2].replace(".", ","),
      text: textLines,
    });
  }
  return entries;
}

function timeToMs(t: string): number {
  const [hms, ms] = t.split(",");
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600000 + m * 60000 + s * 1000 + Number(ms);
}

function msToTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(mil).padStart(3, "0")}`;
}

function hasOverlaps(entries: SRTEntry[]): boolean {
  for (let i = 0; i < entries.length - 1; i++) {
    if (timeToMs(entries[i].endTime) > timeToMs(entries[i + 1].startTime)) return true;
  }
  return false;
}

function fixOverlapsInEntries(entries: SRTEntry[]): SRTEntry[] {
  return entries.map((entry, i) => {
    if (i < entries.length - 1) {
      const nextStart = timeToMs(entries[i + 1].startTime);
      const currentEnd = timeToMs(entry.endTime);
      if (currentEnd > nextStart) {
        const newEnd = Math.max(nextStart - 1, timeToMs(entry.startTime) + 1);
        return { ...entry, endTime: msToTime(newEnd) };
      }
    }
    return entry;
  });
}

function stripLeadingNumber(line: string): string {
  return line.replace(
    /^\s*[\(\[\{]?\s*\d+\s*[\)\]\}\.\:\-–—]\s*/,
    ""
  );
}

function cleanSentenceBlock(text: string): string {
  return text
    .split("\n")
    .map((l) => stripLeadingNumber(l))
    .join("\n");
}

function generateSRT(entries: SRTEntry[], sentences: string[]): string {
  const lines: string[] = [];
  const count = Math.min(entries.length, sentences.length);
  for (let i = 0; i < count; i++) {
    lines.push(`${i + 1}`);
    lines.push(`${entries[i].startTime} --> ${entries[i].endTime}`);
    lines.push(sentences[i].trim());
    lines.push("");
  }
  return lines.join("\n");
}

export default function SrtMergerTab() {
  const [srtEntries, setSrtEntries] = useState<SRTEntry[]>([]);
  const [sentenceText, setSentenceText] = useState("");
  const [addMoreText, setAddMoreText] = useState("");
  const [sentenceHistory, setSentenceHistory] = useState<string[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddMore = () => {
    const newLines = addMoreText
      .split("\n")
      .map((s) => stripLeadingNumber(s).trim())
      .filter((s) => s.length > 0);
    if (newLines.length === 0) return;
    setSentenceHistory((h) => [...h, sentenceText]);
    setSentenceText((prev) => {
      const existing = prev.trim();
      return existing ? existing + "\n" + newLines.join("\n") : newLines.join("\n");
    });
    setAddMoreText("");
    setIsGenerated(false);
    toast({ title: `${newLines.length} sentences added`, description: "Appended to existing list" });
  };

  const handleUndo = () => {
    if (sentenceHistory.length === 0) return;
    const prev = sentenceHistory[sentenceHistory.length - 1];
    setSentenceHistory((h) => h.slice(0, -1));
    setSentenceText(prev);
    toast({ title: "Undone", description: "Last added batch removed" });
  };

  const sentences = sentenceText
    .split("\n")
    .map((s) => stripLeadingNumber(s).trim())
    .filter((s) => s.length > 0);

  const outputEntries = srtEntries.slice(0, sentences.length).map((entry, i) => ({
    ...entry,
    newText: sentences[i],
  }));

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".srt")) {
      toast({ title: "Invalid file", description: "Please upload a .srt file", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseSRT(content);
      setSrtEntries(parsed);
      setIsGenerated(false);
      toast({ title: "SRT loaded", description: `${parsed.length} subtitle entries found` });
    };
    reader.readAsText(file, "utf-8");
  }, [toast]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const moveEntry = (i: number, dir: -1 | 1) => {
    const next = i + dir;
    if (next < 0 || next >= srtEntries.length) return;
    const updated = [...srtEntries];
    [updated[i], updated[next]] = [updated[next], updated[i]];
    setSrtEntries(updated);
  };

  const deleteEntry = (i: number) => {
    setSrtEntries(srtEntries.filter((_, idx) => idx !== i));
  };

  const addEntryAfter = (i: number) => {
    const prev = srtEntries[i];
    const newEntry: SRTEntry = {
      index: prev.index + 1,
      startTime: prev.endTime,
      endTime: prev.endTime,
      text: "",
    };
    const updated = [...srtEntries];
    updated.splice(i + 1, 0, newEntry);
    setSrtEntries(updated);
  };

  const clearSRT = () => {
    setSrtEntries([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fixOverlap = () => {
    const fixed = fixOverlapsInEntries(srtEntries);
    setSrtEntries(fixed);
    toast({ title: "Overlaps fixed!", description: "End times adjusted to remove overlaps" });
  };

  const overlapsExist = srtEntries.length > 1 && hasOverlaps(srtEntries);

  const handleDownload = () => {
    if (outputEntries.length === 0) {
      toast({ title: "Nothing to download", description: "Generate output first", variant: "destructive" });
      return;
    }
    const content = generateSRT(srtEntries, sentences);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const matchCount = Math.min(srtEntries.length, sentences.length);

  return (
    <div className="h-screen flex flex-col bg-[#f5f7fa] font-sans overflow-hidden">
      {/* Header — top card */}
      <div className="w-full mx-auto px-6 pt-4 flex-shrink-0">
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" />
          <span className="font-semibold text-gray-800 text-sm">SRT Merger</span>
          {matchCount > 0 && (
            <span className="ml-2 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium">
              ✓ {matchCount} lines matched
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (outputEntries.length === 0) {
                toast({ title: "Not ready", description: "Upload SRT and add sentences first", variant: "destructive" });
              } else {
                setIsGenerated(true);
                toast({ title: "SRT Generated!", description: `${outputEntries.length} subtitles merged` });
              }
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm h-8 px-3 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate SRT
          </Button>
          <Button
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8 px-3 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download SRT
          </Button>
        </div>
      </div>

      </div>

      {/* Three Cards */}
      <div className="w-full mx-auto px-6 py-4 grid grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Card 1 — SRT Upload */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
              <div>
                <div className="font-semibold text-gray-800 text-sm">SRT Input</div>
                <div className="text-xs text-gray-400">Upload your SRT file</div>
              </div>
            </div>
            {srtEntries.length > 0 && (
              <div className="flex items-center gap-3">
                {overlapsExist && (
                  <button
                    onClick={fixOverlap}
                    className="text-xs text-orange-500 hover:text-orange-600 font-medium border border-orange-200 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded transition-colors"
                  >
                    Fix Overlap
                  </button>
                )}
                <button
                  onClick={() => {
                    const text = srtEntries.map((e, i) => `(${i + 1}) ${e.text}`).join("\n");
                    navigator.clipboard.writeText(text).then(
                      () => toast({ title: "Copied", description: `Copied ${srtEntries.length} lines to clipboard` }),
                      () => toast({ title: "Copy failed", description: "Could not copy to clipboard", variant: "destructive" })
                    );
                  }}
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                >
                  Copy all
                </button>
                <button onClick={clearSRT} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Drop Zone */}
            {srtEntries.length === 0 ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-gray-600">Drop SRT file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                <p className="text-xs text-gray-300 mt-1">.srt files only</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".srt"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            ) : (
              <>
                {/* File name badge */}
                <div className="flex items-center gap-2 px-2 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 mb-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-emerald-700 font-medium truncate">{fileName}</span>
                  <span className="ml-auto text-xs text-emerald-500">{srtEntries.length} entries</span>
                </div>

                {/* Subtitle cards */}
                {srtEntries.map((entry, i) => {
                  const nextEntry = srtEntries[i + 1];
                  const isOverlapping = nextEntry
                    ? timeToMs(entry.endTime) > timeToMs(nextEntry.startTime)
                    : false;
                  return (
                  <div key={i} className={`border rounded-lg p-3 transition-colors ${
                    isOverlapping
                      ? "border-red-200 bg-red-50/40 hover:bg-red-50"
                      : "border-gray-100 bg-gray-50/50 hover:bg-white"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold flex-shrink-0 ${
                          isOverlapping ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        }`}>
                          {i + 1}
                        </span>
                        <span className={`text-xs font-mono tabular-nums truncate ${
                          isOverlapping ? "text-red-500" : "text-gray-500"
                        }`}>
                          {entry.startTime} → {entry.endTime}
                          {isOverlapping && <span className="ml-1 text-red-400">⚠</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveEntry(i, -1)}
                          disabled={i === 0}
                          className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={() => moveEntry(i, 1)}
                          disabled={i === srtEntries.length - 1}
                          className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={() => addEntryAfter(i)}
                          className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={() => deleteEntry(i)}
                          className="p-0.5 rounded hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    {entry.text && (
                      <p className="text-xs text-gray-600 mt-2 ml-7 leading-relaxed line-clamp-2">{entry.text}</p>
                    )}
                  </div>
                  );
                })}

                {/* Add more button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-xs text-gray-400 hover:text-emerald-500 py-2 transition-colors"
                >
                  + Upload different file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".srt"
                  className="hidden"
                  onChange={onFileChange}
                />
              </>
            )}
          </div>
        </div>

        {/* Card 2 — Sentence Input */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
              <div>
                <div className="font-semibold text-gray-800 text-sm">Sentence Input</div>
                <div className="text-xs text-gray-400">One sentence per line</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sentences.length > 0 && (
                <span className="bg-blue-50 text-blue-600 border border-blue-100 text-xs px-2 py-0.5 rounded-full font-medium">
                  {sentences.length} lines
                </span>
              )}
              {sentenceHistory.length > 0 && (
                <button
                  onClick={handleUndo}
                  title="Undo last added batch"
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  ⟲ Undo
                </button>
              )}
              {sentenceText && (
                <button
                  onClick={() => { setSentenceText(""); setSentenceHistory([]); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {sentences.length === 0 ? (
              <div className="relative h-full min-h-[300px]">
                {!sentenceText && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 text-gray-400">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <p className="text-sm">Type or paste your sentences below</p>
                    <p className="text-xs">One sentence per line</p>
                  </div>
                )}
                <Textarea
                  value={sentenceText}
                  onChange={(e) => setSentenceText(e.target.value)}
                  placeholder=""
                  className="absolute inset-0 w-full h-full text-sm resize-none border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 bg-transparent"
                />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Add more sentences — top */}
                <div className="pb-3 mb-2 border-b border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">+ Add more sentences (from {sentences.length + 1})</p>
                  <Textarea
                    value={addMoreText}
                    onChange={(e) => setAddMoreText(e.target.value)}
                    placeholder={"Paste next batch here...\nOne sentence per line"}
                    className="min-h-[120px] text-sm resize-none border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        handleAddMore();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddMore}
                    disabled={!addMoreText.trim()}
                    className="mt-1.5 w-full text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-md py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    Add to list (Ctrl+Enter)
                  </button>
                </div>

                {sentences.map((sentence, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 p-2.5 rounded-lg border transition-colors ${
                      i < srtEntries.length
                        ? "border-emerald-100 bg-emerald-50/40"
                        : "border-orange-100 bg-orange-50/40"
                    }`}
                  >
                    <span className="text-xs font-semibold text-gray-400 mt-0.5 w-5 flex-shrink-0 text-right">
                      {i + 1}.
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{sentence}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 3 — Output SRT */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
              <div>
                <div className="font-semibold text-gray-800 text-sm">Output SRT</div>
                <div className="text-xs text-gray-400">Preview & download</div>
              </div>
            </div>
            {isGenerated && outputEntries.length > 0 && (
              <span className="bg-orange-50 text-orange-600 border border-orange-100 text-xs px-2 py-0.5 rounded-full font-medium">
                {outputEntries.length} cards
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!isGenerated ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Output will appear here</p>
                  <p className="text-xs mt-1">
                    {outputEntries.length > 0
                      ? "Click \"Generate SRT\" to create output"
                      : "Upload SRT + add sentences, then click Generate"}
                  </p>
                  {outputEntries.length > 0 && (
                    <p className="text-xs mt-2 text-emerald-500 font-medium">
                      ✓ {outputEntries.length} subtitles ready to generate
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {outputEntries.map((entry, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 hover:border-emerald-200 hover:bg-emerald-50/20 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 bg-emerald-500 text-white rounded text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs text-gray-500 font-mono tabular-nums">
                        {entry.startTime} → {entry.endTime}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 ml-7 leading-relaxed">{entry.newText}</p>
                  </div>
                ))}
                {/* Mismatch warning */}
                {srtEntries.length > 0 && sentences.length > 0 && srtEntries.length !== sentences.length && (
                  <div className={`rounded-lg p-2.5 text-xs border ${
                    srtEntries.length > sentences.length
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                  }`}>
                    {srtEntries.length > sentences.length
                      ? `⚠️ ${srtEntries.length - sentences.length} extra timecodes — add more sentences`
                      : `ℹ️ ${sentences.length - srtEntries.length} extra sentences — only ${srtEntries.length} will be used`}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
