import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload } from "lucide-react";
export function Recorder({
  onSend,
  label = "Use this recording",
}: {
  onSend: (blob: Blob) => Promise<void>;
  label?: string;
}) {
  const [recording, setRecording] = useState(false),
    [pending, setPending] = useState(false),
    [blob, setBlob] = useState<Blob | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (!blob) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function start() {
    setError("");
    setPending(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error("Recording is unavailable in this browser. Use the text fields below.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const r = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (mounted.current) {
          setBlob(new Blob(chunks, { type: r.mimeType }));
          setRecording(false);
        }
      };
      r.onerror = () => {
        stop();
        setError("Recording failed. Please retry or use text.");
      };
      r.start();
      setBlob(null);
      setRecording(true);
      timer.current = setTimeout(stop, 60000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in browser settings, or use text below."
          : e instanceof Error
            ? e.message
            : "Microphone unavailable.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="recorder">
      <p className="eyebrow">VOICE NOTE · UP TO 60 SECONDS</p>
      <button
        type="button"
        className={recording ? "record-button recording" : "record-button"}
        disabled={pending}
        onClick={recording ? stop : start}
      >
        {recording ? <Square /> : <Mic />}
        {recording ? "Stop recording" : "Record your voice"}
      </button>
      <p className="muted">
        {recording
          ? "Recording… tap stop when you finish."
          : "Speak naturally. Listen before sending."}
      </p>
      {url && (
        <>
          <audio controls src={url} aria-label="Preview your recording" />
          <div className="actions">
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                if (!blob) return;
                setPending(true);
                setError("");
                try {
                  await onSend(blob);
                  setBlob(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              <Upload size={18} />
              {pending ? "Processing…" : label}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={pending}
              onClick={() => setBlob(null)}
            >
              <Trash2 size={18} />
              Discard
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export function ReadAloud({ text, language = "en" }: { text: string; language?: string }) {
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setError("");
          if (!("speechSynthesis" in window)) {
            setError("Spoken readback is unavailable in this browser.");
            return;
          }
          const lang = language === "ur" ? "ur" : "en";
          const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang));
          if (!voice) {
            setError(
              `No ${lang === "ur" ? "Urdu" : "English"} voice is installed. Please read the draft or use another device.`,
            );
            return;
          }
          speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = voice;
          utterance.lang = voice.lang;
          utterance.onerror = () => setError("Readback could not play. Please review the text.");
          speechSynthesis.speak(utterance);
        }}
      >
        Listen to this text
      </button>
      {error && (
        <p role="status" className="muted">
          {error}
        </p>
      )}
    </>
  );
}
