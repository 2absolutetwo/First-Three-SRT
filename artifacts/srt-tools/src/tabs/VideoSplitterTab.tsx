import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Film,
  FileText,
  Scissors,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Sparkles,
  X,
} from "lucide-react";

const queryClient = new QueryClient();

interface SrtPreview {
  count: number;
  totalSeconds: number;
  sample: { index: number; startSec: number; endSec: number; text: string }[];
  overlapCount?: number;
  overlaps?: { a: number; b: number; overlapSec: number }[];
}

interface ClipMeta {
  index: number;
  text: string;
  startSec: number;
  endSec: number;
  filename: string;
}

interface JobInit {
  jobId: string;
  baseName: string;
  total: number;
  clips: ClipMeta[];
}

interface ClipStatus {
  index: number;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

interface JobStatus {
  total: number;
  done: number;
  errors: number;
  finished: boolean;
  clips: ClipStatus[];
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ClipThumb({
  status,
  index,
}: {
  status: "pending" | "running" | "done" | "error";
  index: number;
}) {
  const tone =
    status === "done"
      ? "from-indigo-500/15 via-violet-500/10 to-fuchsia-500/15"
      : status === "running"
        ? "from-indigo-400/20 via-indigo-300/10 to-violet-300/20"
        : status === "error"
          ? "from-red-200/40 to-red-100/20 dark:from-red-900/30 dark:to-red-950/30"
          : "from-slate-200/60 to-slate-100/40 dark:from-slate-800 dark:to-slate-900";

  return (
    <div
      className={`relative w-full h-full bg-gradient-to-br ${tone} flex items-center justify-center`}
    >
      {status === "running" ? (
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      ) : status === "error" ? (
        <AlertCircle className="w-5 h-5 text-red-500" />
      ) : status === "done" ? (
        <Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-0.5" />
      ) : (
        <Film className="w-5 h-5 text-slate-400" />
      )}
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-slate-500/0 select-none">
        {index}
      </span>
    </div>
  );
}

function PreviewModal({
  src,
  filename,
  onClose,
}: {
  src: string;
  filename: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-slate-200">
          <p className="text-sm font-mono truncate">{filename}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <video
          src={src}
          controls
          autoPlay
          playsInline
          className="w-full max-h-[70vh] bg-black"
        />
      </div>
    </div>
  );
}

function UploadTile({
  tone,
  icon,
  title,
  hint,
  file,
  onPick,
  onClear,
  accept,
  alert,
}: {
  tone: "emerald" | "rose";
  icon: React.ReactNode;
  title: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
  onClear: () => void;
  accept: string;
  alert?: { title: string; detail?: string } | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const palette =
    tone === "emerald"
      ? {
          bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
          border: "border-emerald-200/80 dark:border-emerald-900/60",
          hover:
            "hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
          chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
          icon: "text-emerald-600 dark:text-emerald-400",
        }
      : {
          bg: "bg-rose-50/80 dark:bg-rose-950/30",
          border: "border-rose-200/80 dark:border-rose-900/60",
          hover:
            "hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40",
          chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
          icon: "text-rose-600 dark:text-rose-400",
        };

  const idle = {
    bg: "bg-[#f7f6f2] dark:bg-slate-900/60",
    border: "border-slate-200/80 dark:border-slate-800",
    hover: "hover:border-slate-300 hover:bg-[#f3f2ed] dark:hover:bg-slate-900/80",
    icon: "text-slate-500 dark:text-slate-400",
  };

  const active = !!file;
  const containerClasses = alert
    ? "border-amber-400 dark:border-amber-500/70 bg-amber-50/80 dark:bg-amber-950/30"
    : active
      ? `${palette.border} ${palette.bg}`
      : `${idle.border} ${idle.bg}`;
  const hoverClasses = active ? palette.hover : idle.hover;
  const iconColor = active ? palette.icon : idle.icon;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border ${containerClasses} ${hoverClasses} px-5 py-4 transition-all`}
    >
      {alert && (
        <div
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900"
          title={alert.title}
        >
          <AlertCircle className="w-4 h-4" />
        </div>
      )}
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-4">
        <div
          className={`shrink-0 w-11 h-11 rounded-xl bg-white/80 dark:bg-slate-900/60 flex items-center justify-center ${iconColor} shadow-sm`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          {file ? (
            <>
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                {file.name}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {formatBytes(file.size)} · click to replace
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                {title}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
            </>
          )}
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="shrink-0 w-7 h-7 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white dark:hover:bg-slate-800"
            aria-label="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {alert && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-800 px-3 py-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              {alert.title}
            </p>
            {alert.detail && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                {alert.detail}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Home({ incomingSrt, incomingSrtFilename, incomingSrtKey }: { incomingSrt?: string; incomingSrtFilename?: string; incomingSrtKey?: number }) {
  const { toast } = useToast();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtPreview, setSrtPreview] = useState<SrtPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const [job, setJob] = useState<JobInit | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [previewClip, setPreviewClip] = useState<ClipMeta | null>(null);

  const apiBase = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");
  const lastIncomingSrtKey = useRef<number | undefined>(undefined);

  // Poll status while job is active
  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const r = await fetch(`${apiBase}/segment/${job.jobId}/status`);
        if (!r.ok) throw new Error(await r.text());
        const s: JobStatus = await r.json();
        if (cancelled) return;
        setStatus(s);
        if (!s.finished) {
          timer = window.setTimeout(tick, 1000);
        }
      } catch (err) {
        if (cancelled) return;
        toast({
          title: "Couldn't fetch status",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [job, apiBase, toast]);

  useEffect(() => {
    if (!incomingSrt || !incomingSrt.trim()) return;
    if (incomingSrtKey === lastIncomingSrtKey.current) return;
    lastIncomingSrtKey.current = incomingSrtKey;
    const name = incomingSrtFilename || "from-time-spliter.srt";
    const file = new File([incomingSrt], name, { type: "text/plain" });
    void handleSrtChange(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingSrt, incomingSrtFilename, incomingSrtKey]);

  async function handleSrtChange(f: File | null) {
    setSrtFile(f);
    setSrtPreview(null);
    if (!f) return;
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append("srt", f);
      const r = await fetch(`${apiBase}/srt-preview`, {
        method: "POST",
        body: fd,
      });
      if (!r.ok) throw new Error(await r.text());
      setSrtPreview(await r.json());
    } catch (err) {
      toast({
        title: "Couldn't read SRT",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setPreviewing(false);
    }
  }

  function startSegment() {
    if (!videoFile || !srtFile) return;
    setUploading(true);
    setUploadPct(0);
    setJob(null);
    setStatus(null);

    const fd = new FormData();
    fd.append("video", videoFile);
    fd.append("srt", srtFile);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBase}/segment`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadPct(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = xhr.response as JobInit;
        setJob(data);
        toast({
          title: "Cutting started",
          description: `${data.total} clips, 6 in parallel`,
        });
      } else {
        const errMsg =
          (xhr.response as { error?: string })?.error || `HTTP ${xhr.status}`;
        toast({
          title: "Upload failed",
          description: errMsg,
          variant: "destructive",
        });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      toast({
        title: "Upload failed",
        description: "Network error",
        variant: "destructive",
      });
    };

    xhr.send(fd);
  }

  function reset() {
    setJob(null);
    setStatus(null);
    setVideoFile(null);
    setSrtFile(null);
    setSrtPreview(null);
    setUploadPct(0);
  }

  const canRun = !!videoFile && !!srtFile && !uploading && !job;

  // Build merged view: clip metadata + live status
  const statusByIndex = new Map<number, ClipStatus>(
    (status?.clips ?? []).map((c) => [c.index, c]),
  );
  const doneCount = status?.done ?? 0;
  const errorCount = status?.errors ?? 0;
  const total = job?.total ?? 0;
  const overallPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.10),transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(244,114,182,0.10),transparent_55%)] bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Top bar */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-sm px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-md">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50 leading-tight">
                Video Spliter
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                {job ? (
                  <>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {doneCount}
                    </span>{" "}
                    of {total} clips ready
                    {errorCount > 0 && (
                      <span className="text-red-500"> · {errorCount} failed</span>
                    )}
                    {status?.finished && doneCount === total && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {" "}
                        · all done
                      </span>
                    )}
                  </>
                ) : (
                  <>One clip per subtitle line</>
                )}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {srtPreview && !job && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {srtPreview.count}
                  </span>{" "}
                  subtitles
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>{formatDuration(srtPreview.totalSeconds)}</span>
              </div>
            )}
            {job && doneCount > 0 && (
              <a
                href={`${apiBase}/segment/${job.jobId}/zip`}
                download={`${job.baseName || "clips"}.zip`}
                className="inline-flex items-center gap-1.5 px-3 h-7 rounded-md bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold tracking-wider uppercase shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                ZIP
              </a>
            )}
            {job ? (
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="h-7 rounded-md text-xs px-3"
              >
                New job
              </Button>
            ) : (
              <Button
                onClick={startSegment}
                disabled={!canRun}
                className="h-9 rounded-lg px-4 text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700 text-white shadow-md disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Uploading {uploadPct}%
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Video Split
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Upload tiles */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadTile
            tone="emerald"
            icon={<FileText className="w-5 h-5" />}
            title="Upload SRT"
            hint={previewing ? "Parsing…" : "SubRip subtitle (.srt)"}
            file={srtFile}
            onPick={handleSrtChange}
            onClear={() => {
              setSrtFile(null);
              setSrtPreview(null);
            }}
            accept=".srt,text/plain"
            alert={
              srtPreview && (srtPreview.overlapCount ?? 0) > 0
                ? {
                    title: `Overlapping subtitles detected (${srtPreview.overlapCount})`,
                    detail:
                      srtPreview.overlaps && srtPreview.overlaps.length > 0
                        ? `e.g. #${srtPreview.overlaps[0]!.a} overlaps #${srtPreview.overlaps[0]!.b} by ${srtPreview.overlaps[0]!.overlapSec}s. Clips may contain duplicate footage.`
                        : "Some cues overlap in time. Clips may contain duplicate footage.",
                  }
                : null
            }
          />
          <UploadTile
            tone="rose"
            icon={<Film className="w-5 h-5" />}
            title="Upload Video"
            hint="MP4, MOV, MKV, WebM…"
            file={videoFile}
            onPick={setVideoFile}
            onClear={() => setVideoFile(null)}
            accept="video/*"
          />
        </div>

        {/* Upload progress (between tiles and grid) */}
        {uploading && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur p-4">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-2">
              <span>Uploading video & subtitle…</span>
              <span className="font-mono">{uploadPct}%</span>
            </div>
            <Progress value={uploadPct} />
          </div>
        )}

        {/* Job progress bar — only while processing */}
        {job && overallPct < 100 && (
          <div className="mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
              <span>Progress</span>
              <span className="font-mono">{overallPct}%</span>
            </div>
            <Progress value={overallPct} />
          </div>
        )}

        {/* Clip grid */}
        {job && (
          <div className="mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md p-4 shadow-sm">
            <div
              className="grid gap-2 max-h-[68vh] overflow-y-auto pr-1"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(140px, 1fr))",
              }}
            >
              {job.clips.map((clip) => {
                const s = statusByIndex.get(clip.index)?.status ?? "pending";
                const err = statusByIndex.get(clip.index)?.error;
                const downloadUrl = `${apiBase}/segment/${job.jobId}/clip/${clip.index}`;
                const duration = clip.endSec - clip.startSec;
                const isDone = s === "done";

                const ring =
                  s === "done"
                    ? "ring-1 ring-emerald-200 dark:ring-emerald-900/50"
                    : s === "error"
                      ? "ring-1 ring-red-200 dark:ring-red-900/50"
                      : s === "running"
                        ? "ring-1 ring-indigo-200 dark:ring-indigo-900/50"
                        : "ring-1 ring-slate-200 dark:ring-slate-800";

                const statusDot = (() => {
                  if (s === "done")
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-medium">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </span>
                    );
                  if (s === "running")
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/90 text-white text-[10px] font-medium">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      </span>
                    );
                  if (s === "error")
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/90 text-white text-[10px] font-medium">
                        <AlertCircle className="w-2.5 h-2.5" />
                      </span>
                    );
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-700/80 text-white text-[10px] font-medium">
                      <Clock className="w-2.5 h-2.5" />
                    </span>
                  );
                })();

                return (
                  <div
                    key={clip.index}
                    title={clip.text}
                    className={`group relative flex flex-col rounded-xl overflow-hidden bg-white dark:bg-slate-900 ${ring} hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all`}
                  >
                    <button
                      type="button"
                      disabled={!isDone}
                      onClick={() => isDone && setPreviewClip(clip)}
                      className={`relative w-full aspect-video bg-slate-100 dark:bg-slate-800 ${
                        isDone ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <ClipThumb status={s} index={clip.index} />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono leading-none">
                        #{clip.index}
                      </div>
                      <div className="absolute top-1 right-1">{statusDot}</div>
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono leading-none">
                        {duration.toFixed(1)}s
                      </div>
                    </button>

                    <div className="px-2 py-1.5 flex items-center gap-1.5">
                      <p className="flex-1 min-w-0 text-[11px] leading-tight text-slate-700 dark:text-slate-300 truncate">
                        {clip.text || (
                          <span className="text-slate-400">(no text)</span>
                        )}
                      </p>
                      {isDone ? (
                        <a
                          href={downloadUrl}
                          download={clip.filename}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 w-6 h-6 inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                          aria-label="Download"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="shrink-0 w-6 h-6 inline-flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                          <Download className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {err && (
                      <div className="px-2 pb-1.5 -mt-1">
                        <p className="text-[10px] text-red-500 line-clamp-2">
                          {err}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-500">
              Clips stay available for 1 hour · stream-copy (no re-encode) · 6
              in parallel
            </p>
          </div>
        )}

        {previewClip && job && (
          <PreviewModal
            src={`${apiBase}/segment/${job.jobId}/clip/${previewClip.index}`}
            filename={previewClip.filename}
            onClose={() => setPreviewClip(null)}
          />
        )}

        {!job && !uploading && (
          <p className="mt-6 text-center text-xs text-slate-500">
            Drop a video and its <span className="font-mono">.srt</span> above,
            then hit{" "}
            <span className="font-semibold tracking-wider">VIDEO SPLIT</span>.
          </p>
        )}
      </div>
    </div>
  );
}

function App({ incomingSrt, incomingSrtFilename, incomingSrtKey }: { incomingSrt?: string; incomingSrtFilename?: string; incomingSrtKey?: number } = {}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Home incomingSrt={incomingSrt} incomingSrtFilename={incomingSrtFilename} incomingSrtKey={incomingSrtKey} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
