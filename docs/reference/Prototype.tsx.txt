import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Accessibility,
  AirVent,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Drill,
  Ear,
  Hammer,
  House,
  LocateFixed,
  MapPin,
  Menu,
  MessageCircleMore,
  Mic,
  Phone,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Volume2,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";

type Lang = "roman" | "ur" | "en";
type Role = "worker" | "customer";
type Screen =
  | "welcome"
  | "trade"
  | "intro"
  | "area"
  | "draft"
  | "worker"
  | "discover"
  | "profile"
  | "chat"
  | "agreement"
  | "active"
  | "review";

const workerPhoto =
  "https://images.unsplash.com/photo-1629646182485-715b5b5cbd47?crop=faces&cs=tinysrgb&fit=crop&fm=jpg&h=320&q=80&w=320";

const copy = {
  roman: {
    name: "Roshan Rozgar",
    tagline: "Hunar nazar aaye. Rozgar mil jaye.",
    find: "Kaam ke liye ustad dhoondein",
    offer: "Main kaam karta hoon",
    speak: "Bol kar batayein",
    listen: "Dobara sunein",
    available: "Abhi farigh hoon",
    busy: "Tasdeeq shuda kaam jaari hai",
    next: "Aagay chalein",
  },
  ur: {
    name: "روشن روزگار",
    tagline: "ہنر نظر آئے، روزگار مل جائے",
    find: "کام کے لیے کاریگر ڈھونڈیں",
    offer: "میں کام کرتا ہوں",
    speak: "بول کر بتائیں",
    listen: "دوبارہ سنیں",
    available: "ابھی فارغ ہوں",
    busy: "تصدیق شدہ کام جاری ہے",
    next: "آگے چلیں",
  },
  en: {
    name: "Roshan Rozgar",
    tagline: "Let skill be seen. Let work be found.",
    find: "Find a skilled worker",
    offer: "Offer my services",
    speak: "Describe by voice",
    listen: "Listen again",
    available: "Available now",
    busy: "Busy with a confirmed job",
    next: "Continue",
  },
};

const journey: { id: Screen; label: string; role: Role }[] = [
  { id: "welcome", label: "Choose role", role: "customer" },
  { id: "trade", label: "Choose trade", role: "worker" },
  { id: "intro", label: "Voice profile", role: "worker" },
  { id: "area", label: "Service area", role: "worker" },
  { id: "draft", label: "Confirm profile", role: "worker" },
  { id: "worker", label: "Go available", role: "worker" },
  { id: "discover", label: "Find local help", role: "customer" },
  { id: "profile", label: "Check trust", role: "customer" },
  { id: "chat", label: "Discuss by voice", role: "customer" },
  { id: "agreement", label: "Agree price", role: "customer" },
  { id: "active", label: "Complete job", role: "worker" },
  { id: "review", label: "Build reputation", role: "customer" },
];

const trades = [
  { name: "Electrician", roman: "Bijli ka kaam", icon: Zap, color: "#F3A712" },
  { name: "Plumber", roman: "Nal / pipe", icon: Wrench, color: "#168F63" },
  { name: "AC Technician", roman: "AC ustad", icon: AirVent, color: "#2C7180" },
  { name: "Carpenter", roman: "Lakri ka kaam", icon: Hammer, color: "#A45F00" },
  { name: "Mechanic", roman: "Gaari mechanic", icon: Drill, color: "#A83232" },
];

function speak(text: string) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(text);
    voice.rate = 0.88;
    window.speechSynthesis.speak(voice);
  }
}

function SpeakerButton({ text, label = "Dobara sunein" }: { text: string; label?: string }) {
  return (
    <button className="speaker" onClick={() => speak(text)} aria-label={label} title={label}>
      <Volume2 size={21} strokeWidth={2.6} />
    </button>
  );
}

function AcousticCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;
    const draw = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      const size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const phase = frame * 0.055;
      for (let i = 0; i < 4; i++) {
        const energy = active ? Math.sin(phase + i * 1.8) * 5 + 9 : 0;
        const radius = size * (0.29 + i * 0.06) + energy;
        ctx.beginPath();
        ctx.arc(cx, cx, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${active ? "243,167,18" : "11,93,75"},${0.36 - i * 0.065})`;
        ctx.lineWidth = active ? 3 : 1.5;
        ctx.stroke();
      }
      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return <canvas ref={ref} className="acoustic" aria-hidden="true" />;
}

function VoiceChamber({
  compact = false,
  onComplete,
}: {
  compact?: boolean;
  onComplete?: () => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "ready">("idle");
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    setState("recording");
    navigator.vibrate?.(35);
    timer.current = window.setTimeout(() => {
      setState("ready");
      onComplete?.();
      navigator.vibrate?.([30, 40, 30]);
    }, 1700);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    if (state === "recording") {
      setState("ready");
      onComplete?.();
    }
  };
  return (
    <div className={`voice-chamber ${compact ? "compact" : ""}`}>
      <AcousticCanvas active={state === "recording"} />
      <button
        className={`mic-hardware ${state}`}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        aria-label="Hold to record voice"
      >
        {state === "ready" ? <Check size={compact ? 30 : 42} /> : <Mic size={compact ? 30 : 42} />}
        <span>
          {state === "recording"
            ? "SUN RAHA HOON"
            : state === "ready"
              ? "AWAAZ TAYYAR"
              : "DABA KAR BOLEIN"}
        </span>
      </button>
      {!compact && (
        <div className="voice-status">
          <span className={state === "recording" ? "live-dot" : "status-dot"} />
          {state === "recording"
            ? "Recording · 0:02"
            : state === "ready"
              ? "Voice note · 0:08"
              : "Hold, speak, then release"}
        </div>
      )}
    </div>
  );
}

function TradeGrid({
  selected,
  setSelected,
}: {
  selected: number;
  setSelected: (n: number) => void;
}) {
  return (
    <div className="trade-grid">
      {trades.map((trade, index) => {
        const Icon = trade.icon;
        return (
          <motion.button
            whileTap={{ y: 5, rotateX: 3 }}
            key={trade.name}
            className={`trade-token ${selected === index ? "selected" : ""}`}
            onClick={() => setSelected(index)}
            style={{ "--trade": trade.color } as React.CSSProperties}
          >
            <div className="trade-emblem">
              <Icon size={32} strokeWidth={2.5} />
            </div>
            <span>{trade.name}</span>
            <small>{trade.roman}</small>
            {selected === index && <Check className="trade-check" size={18} />}
          </motion.button>
        );
      })}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  text,
  audio,
}: {
  eyebrow: string;
  title: string;
  text: string;
  audio?: string;
}) {
  return (
    <header className="page-heading">
      <div className="eyebrow">{eyebrow}</div>
      <div className="heading-row">
        <h1>{title}</h1>
        <SpeakerButton text={audio || `${title}. ${text}`} />
      </div>
      <p>{text}</p>
    </header>
  );
}

function Waveform({ playing = false }: { playing?: boolean }) {
  return (
    <div className={`waveform ${playing ? "playing" : ""}`} aria-hidden="true">
      {[8, 16, 11, 24, 18, 30, 13, 22, 10, 28, 19, 12, 23, 9, 15, 26, 12, 19].map((h, i) => (
        <i key={i} style={{ height: h, animationDelay: `${i * 35}ms` }} />
      ))}
    </div>
  );
}

function AudioNote({ mine = false, text, time }: { mine?: boolean; text: string; time: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`audio-note ${mine ? "mine" : ""}`}>
      <button onClick={() => setPlaying(!playing)} aria-label="Play voice note">
        {playing ? <span className="pause-icon">Ⅱ</span> : <Play size={17} fill="currentColor" />}
      </button>
      <Waveform playing={playing} />
      <b>{time}</b>
      <p>{text}</p>
    </div>
  );
}

function App() {
  const reduceMotion = useReducedMotion();
  const [lang, setLang] = useState<Lang>("roman");
  const [role, setRole] = useState<Role>("customer");
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selectedTrade, setSelectedTrade] = useState(0);
  const [area, setArea] = useState("G-9");
  const [available, setAvailable] = useState(false);
  const [booked, setBooked] = useState(false);
  const [jobStarted, setJobStarted] = useState(false);
  const [jobFinished, setJobFinished] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [rating, setRating] = useState(5);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(["Available now"]);
  const t = copy[lang];
  const index = journey.findIndex((step) => step.id === screen);
  const direction = lang === "ur" ? -1 : 1;

  const go = (next: Screen) => {
    setScreen(next);
    const destination = journey.find((s) => s.id === next);
    if (destination && next !== "welcome") setRole(destination.role);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const roleSwitch = (next: Role) => {
    setRole(next);
    if (next === "worker") go(booked ? "active" : "worker");
    else go(booked ? (jobFinished ? "review" : "active") : "discover");
  };

  const next = () => {
    if (index < journey.length - 1) go(journey[index + 1].id);
  };

  const resetDemo = () => {
    setBooked(false);
    setAgreement(false);
    setJobStarted(false);
    setJobFinished(false);
    setReviewed(false);
    setAvailable(false);
    setConflict(false);
    go("welcome");
  };

  const submitReview = () => {
    setReviewed(true);
    setBooked(false);
    setAvailable(true);
    navigator.vibrate?.([40, 30, 80]);
  };

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 27 };

  return (
    <div className="app-shell" dir={lang === "ur" ? "rtl" : "ltr"}>
      <div className="judge-bar" dir="ltr">
        <div className="judge-label">
          <Sparkles size={14} /> JUDGE LIVE VIEW
        </div>
        <div className="role-switch" aria-label="Switch demo role">
          <button
            className={role === "worker" ? "active" : ""}
            onClick={() => roleSwitch("worker")}
          >
            <BriefcaseBusiness size={15} /> Worker: Aslam
          </button>
          <span>⇄</span>
          <button
            className={role === "customer" ? "active" : ""}
            onClick={() => roleSwitch("customer")}
          >
            <House size={15} /> Customer: Fatima
          </button>
        </div>
        <div className="sync-state">
          <span /> State synced
        </div>
      </div>

      {offline && (
        <button className="offline-banner" onClick={() => setOffline(false)}>
          <WifiOff size={18} /> Offline — your action is saved. Tap to retry.
        </button>
      )}

      <nav className="top-nav">
        <button className="brand" onClick={() => go("welcome")} aria-label="Roshan Rozgar home">
          <span className="sun-mark">
            <i />
          </span>
          <span>
            <b>{t.name}</b>
            <small>ROSHAN ROZGAR</small>
          </span>
        </button>
        <div className="language-switch" dir="ltr">
          {(["ur", "roman", "en"] as Lang[]).map((item) => (
            <button
              key={item}
              className={lang === item ? "active" : ""}
              onClick={() => setLang(item)}
            >
              {item === "ur" ? "اردو" : item === "roman" ? "Roman" : "EN"}
            </button>
          ))}
        </div>
        <button className="journey-button" onClick={() => setJourneyOpen(true)}>
          <Menu size={18} /> <span>Demo path</span>
          <b>{index + 1}/12</b>
        </button>
      </nav>

      <div className="desktop-layout">
        <aside className="desktop-rail" dir="ltr">
          <div className="rail-head">
            <span>12-step story</span>
            <b>{Math.round(((index + 1) / 12) * 100)}%</b>
          </div>
          <div className="rail-line">
            {journey.map((step, i) => (
              <button
                key={step.id}
                className={i === index ? "active" : i < index ? "done" : ""}
                onClick={() => go(step.id)}
              >
                <span>{i < index ? <Check size={12} /> : i + 1}</span>
                <div>
                  <b>{step.label}</b>
                  <small>{step.role}</small>
                </div>
              </button>
            ))}
          </div>
          <button className="reset-demo" onClick={resetDemo}>
            <RotateCcw size={15} /> Reset demo
          </button>
        </aside>

        <main className="phone-stage">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={screen}
              className={`screen screen-${screen}`}
              initial={{ opacity: 0, x: 28 * direction, rotateY: 2 * direction }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: -18 * direction }}
              transition={transition}
            >
              {screen === "welcome" && (
                <Welcome
                  t={t}
                  onWorker={() => {
                    setRole("worker");
                    go("trade");
                  }}
                  onCustomer={() => {
                    setRole("customer");
                    go("discover");
                  }}
                />
              )}
              {screen === "trade" && (
                <>
                  <PageHeading
                    eyebrow="PROFILE · 1 OF 4"
                    title="Aap ka hunar kya hai?"
                    text="Tasveer ko chunein — type karne ki zaroorat nahi."
                  />
                  <TradeGrid selected={selectedTrade} setSelected={setSelectedTrade} />
                  <BottomAction
                    label={`${trades[selectedTrade].name} — ${t.next}`}
                    onClick={next}
                  />
                </>
              )}
              {screen === "intro" && (
                <>
                  <PageHeading
                    eyebrow="PROFILE · 2 OF 4"
                    title="Apna taaruf bol kar dein"
                    text="Naam, tajurba, aur kis qisam ka kaam karte hain."
                    audio="Apna naam, tajurba aur services bol kar batayein. Button daba kar rakhein."
                  />
                  <div className="prompt-card">
                    <Volume2 size={18} />
                    <p>“Mera naam Aslam hai. Main das saal se electrician ka kaam karta hoon...”</p>
                  </div>
                  <VoiceChamber />
                  <div className="privacy-line">
                    <ShieldCheck size={16} /> Aap sun kar tasdeeq karein ge, phir profile publish
                    hogi.
                  </div>
                  <BottomAction label="Awaaz record ho gayi — Aagay" onClick={next} />
                </>
              )}
              {screen === "area" && (
                <>
                  <PageHeading
                    eyebrow="PROFILE · 3 OF 4"
                    title="Kahan kaam kar sakte hain?"
                    text="Sirf ilaqa dikhe ga — ghar ki exact location nahi."
                  />
                  <button className="location-button" onClick={() => setArea("G-9")}>
                    <span>
                      <LocateFixed size={25} />
                      <b>Meri location istemal karein</b>
                    </span>
                    <small>Permission sirf qareebi kaam dhoondne ke liye</small>
                    <ChevronRight size={20} />
                  </button>
                  {permissionDenied && (
                    <div className="inline-error">
                      <CircleAlert /> Location band hai. Neeche se sector chunein.
                    </div>
                  )}
                  <div className="sector-grid">
                    {["G-9", "F-10", "I-8", "Saddar", "Satellite Town"].map((sector) => (
                      <button
                        key={sector}
                        className={area === sector ? "selected" : ""}
                        onClick={() => setArea(sector)}
                      >
                        <MapPin size={20} />
                        <b>{sector}</b>
                        <small>
                          {sector === "G-9" || sector === "F-10" || sector === "I-8"
                            ? "Islamabad"
                            : "Rawalpindi"}
                        </small>
                      </button>
                    ))}
                  </div>
                  <BottomAction label={`${area} — ${t.next}`} onClick={next} />
                </>
              )}
              {screen === "draft" && (
                <>
                  <PageHeading
                    eyebrow="PROFILE · 4 OF 4"
                    title="Suniye, phir tasdeeq karein"
                    text="AI ne sirf aap ki awaaz se yeh maloomat nikali hai."
                  />
                  <div className="ai-draft">
                    <div className="ai-title">
                      <span>
                        <Sparkles size={17} /> AI draft
                      </span>
                      <SpeakerButton text="Aslam. Electrician. Das saal ka tajurba. Fan, switch aur wiring theek karte hain." />
                    </div>
                    <DataRow label="Naam" value="Aslam Khan" />
                    <DataRow label="Hunar" value="Electrician" />
                    <DataRow label="Tajurba" value="10 saal · khud bataya" />
                    <DataRow label="Services" value="Fan · switch · wiring" />
                    <DataRow label="Ilaqa" value={`${area} aur qareebi sectors`} />
                  </div>
                  <div className="split-actions">
                    <button className="secondary-button">
                      <Mic size={18} /> Awaaz se durust karein
                    </button>
                    <button className="primary-button" onClick={next}>
                      <Check size={19} /> Profile publish karein
                    </button>
                  </div>
                </>
              )}
              {screen === "worker" && (
                <WorkerHome
                  available={available}
                  setAvailable={setAvailable}
                  booked={booked}
                  t={t}
                  onRequest={() => go("chat")}
                />
              )}
              {screen === "discover" && (
                <Discovery
                  selectedTrade={selectedTrade}
                  setSelectedTrade={setSelectedTrade}
                  selectedFilters={selectedFilters}
                  setSelectedFilters={setSelectedFilters}
                  available={available}
                  onProfile={() => go("profile")}
                  onOffline={() => setOffline(true)}
                />
              )}
              {screen === "profile" && (
                <WorkerProfile
                  available={available}
                  onBack={() => go("discover")}
                  onDiscuss={() => go("chat")}
                />
              )}
              {screen === "chat" && (
                <Conversation onContinue={() => go("agreement")} offline={offline} />
              )}
              {screen === "agreement" && (
                <Agreement
                  accepted={agreement}
                  onAccept={() => {
                    setAgreement(true);
                    setBooked(true);
                    setAvailable(false);
                  }}
                  onContinue={() => go("active")}
                />
              )}
              {screen === "active" && (
                <ActiveJob
                  role={role}
                  started={jobStarted}
                  finished={jobFinished}
                  conflict={conflict}
                  setConflict={setConflict}
                  onStart={() => setJobStarted(true)}
                  onFinish={() => setJobFinished(true)}
                  onReview={() => go("review")}
                  onFindAnother={() => {
                    setConflict(false);
                    go("discover");
                  }}
                />
              )}
              {screen === "review" && (
                <Review
                  rating={rating}
                  setRating={setRating}
                  reviewed={reviewed}
                  onSubmit={submitReview}
                  onHome={() => {
                    setRole("worker");
                    go("worker");
                  }}
                />
              )}
            </motion.section>
          </AnimatePresence>
        </main>

        <aside className="context-panel" dir="ltr">
          <div className="context-card live">
            <div className="context-label">
              <span /> SHARED LIVE STATE
            </div>
            <h3>
              {booked ? "Booking locked" : available ? "Aslam is discoverable" : "Aslam is offline"}
            </h3>
            <dl>
              <div>
                <dt>Worker</dt>
                <dd>Aslam Khan</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{booked ? "Busy" : available ? "Available" : "Not taking jobs"}</dd>
              </div>
              <div>
                <dt>Job</dt>
                <dd>{booked ? "RR-2408-117" : "—"}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{agreement ? "PKR 2,500" : "Not agreed"}</dd>
              </div>
            </dl>
          </div>
          <button className="context-card annotation-card" onClick={() => setAnnotationOpen(true)}>
            <Code2 size={22} />
            <span>
              <b>Developer annotations</b>
              <small>RLS · audio · atomic RPC</small>
            </span>
            <ChevronRight />
          </button>
          <button
            className="context-card annotation-card"
            onClick={() => setRequirementsOpen(true)}
          >
            <BadgeCheck size={22} />
            <span>
              <b>Requirements verified</b>
              <small>8 screens · 5 outcomes</small>
            </span>
            <ChevronRight />
          </button>
          <div className="context-card test-panel">
            <b>Demo conditions</b>
            <label>
              <span>
                <WifiOff size={16} /> Spotty network
              </span>
              <input
                type="checkbox"
                checked={offline}
                onChange={(e) => setOffline(e.target.checked)}
              />
            </label>
            <label>
              <span>
                <MapPin size={16} /> Location denied
              </span>
              <input
                type="checkbox"
                checked={permissionDenied}
                onChange={(e) => setPermissionDenied(e.target.checked)}
              />
            </label>
          </div>
        </aside>
      </div>

      <div className="mobile-bottom-bar" dir="ltr">
        <button onClick={() => setJourneyOpen(true)}>
          <Menu />
          <span>Story</span>
        </button>
        <button onClick={() => roleSwitch("worker")} className={role === "worker" ? "active" : ""}>
          <BriefcaseBusiness />
          <span>Aslam</span>
        </button>
        <button
          className="center-action"
          onClick={() => speak("Aap Roshan Rozgar par hain. Screen par bara button dabayein.")}
        >
          <Ear />
          <span>Listen</span>
        </button>
        <button
          onClick={() => roleSwitch("customer")}
          className={role === "customer" ? "active" : ""}
        >
          <House />
          <span>Fatima</span>
        </button>
        <button onClick={() => setRequirementsOpen(true)}>
          <BadgeCheck />
          <span>Verify</span>
        </button>
      </div>

      <Drawer
        open={journeyOpen}
        onClose={() => setJourneyOpen(false)}
        title="12-step connected story"
      >
        <div className="mobile-journey" dir="ltr">
          {journey.map((step, i) => (
            <button
              key={step.id}
              className={i === index ? "active" : ""}
              onClick={() => {
                go(step.id);
                setJourneyOpen(false);
              }}
            >
              <span>{i < index ? <Check size={15} /> : i + 1}</span>
              <div>
                <b>{step.label}</b>
                <small>View as {step.role}</small>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
          <button
            className="drawer-reset"
            onClick={() => {
              resetDemo();
              setJourneyOpen(false);
            }}
          >
            <RotateCcw /> Reset the full demo
          </button>
        </div>
      </Drawer>

      <Drawer
        open={annotationOpen}
        onClose={() => setAnnotationOpen(false)}
        title="Implementation handoff"
      >
        <div className="annotations" dir="ltr">
          <Annotation
            icon={ShieldCheck}
            title="Supabase RLS"
            text="workers update only their own profile; customers read published profiles; booking participants read shared job records."
            code="auth.uid() = worker_user_id"
          />
          <Annotation
            icon={Mic}
            title="Private audio bucket"
            text="Signed, expiring URLs for voice intros, job notes, and reviews. Never public object URLs."
            code="voice-notes/{user_id}/{uuid}.webm"
          />
          <Annotation
            icon={Sparkles}
            title="Server-side AI validation"
            text="Extraction output is schema-validated. Missing fields remain null and trigger one spoken follow-up."
            code="z.object({ trade, services, experience })"
          />
          <Annotation
            icon={BadgeCheck}
            title="Atomic booking lock"
            text="A single transaction checks availability, creates the booking, and locks the worker before returning."
            code="confirm_atomic_booking(worker_id, request_id)"
          />
        </div>
      </Drawer>

      <Drawer
        open={requirementsOpen}
        onClose={() => setRequirementsOpen(false)}
        title="Requirement → screen"
      >
        <div className="requirements" dir="ltr">
          {[
            ["Zero-typing onboarding", "Steps 2–5", true],
            ["Instant local discovery", "Step 7", true],
            ["Voice scope + PKR agreement", "Steps 9–10", true],
            ["Atomic availability lock", "Steps 10–11", booked],
            ["Conflict recovery preserves request", "Step 11", true],
            ["Review restores availability", "Step 12", reviewed],
            ["Urdu RTL / Roman / English", "Persistent header", true],
            ["Offline + permission states", "Demo conditions", true],
          ].map(([label, place, done]) => (
            <div key={String(label)}>
              <span className={done ? "ok" : ""}>{done ? <Check /> : <Clock3 />}</span>
              <p>
                <b>{label}</b>
                <small>{place}</small>
              </p>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}

function Welcome({
  t,
  onWorker,
  onCustomer,
}: {
  t: typeof copy.roman;
  onWorker: () => void;
  onCustomer: () => void;
}) {
  return (
    <div className="welcome">
      <div className="doorway">
        <div className="sunrise">
          <span />
          <i />
          <i />
          <i />
        </div>
        <div className="door-panel" />
      </div>
      <div className="welcome-copy">
        <div className="eyebrow">ISLAMABAD · RAWALPINDI</div>
        <h1>{t.name}</h1>
        <p>{t.tagline}</p>
      </div>
      <div className="role-cards">
        <motion.button whileTap={{ y: 6 }} className="role-card customer" onClick={onCustomer}>
          <div className="role-icon">
            <Search />
          </div>
          <span>
            <b>{t.find}</b>
            <small>Nearby · available · trusted</small>
          </span>
          <ArrowRight />
        </motion.button>
        <motion.button whileTap={{ y: 6 }} className="role-card worker" onClick={onWorker}>
          <div className="role-icon">
            <Wrench />
          </div>
          <span>
            <b>{t.offer}</b>
            <small>Voice se profile banayein</small>
          </span>
          <ArrowRight />
        </motion.button>
      </div>
      <div className="start-audio">
        <SpeakerButton text="Roshan Rozgar mein khush aamdeed. Kaam dhoondne ya apni services dene ke liye bara button dabayein." />
        <span>
          <b>Start with voice</b>
          <small>Sun kar shuru karein</small>
        </span>
      </div>
      <div className="trust-strip">
        <ShieldCheck />
        <span>
          <b>Platform job evidence</b>
          <small>No fake verification badges</small>
        </span>
      </div>
    </div>
  );
}

function BottomAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="bottom-action" onClick={onClick}>
      <span>{label}</span>
      <ArrowRight size={21} />
    </button>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-row">
      <span>{label}</span>
      <b>{value}</b>
      <Check size={17} />
    </div>
  );
}

function AvailabilityBreaker({
  available,
  setAvailable,
  locked,
}: {
  available: boolean;
  setAvailable: (v: boolean) => void;
  locked: boolean;
}) {
  return (
    <button
      className={`breaker ${available ? "on" : ""} ${locked ? "locked" : ""}`}
      onClick={() => !locked && setAvailable(!available)}
    >
      <div className="breaker-top">
        <span className="status-beacon" />
        <b>{locked ? "LOCKED · JOB ACTIVE" : available ? "LIVE · VISIBLE" : "OFF DUTY"}</b>
        <ShieldCheck size={17} />
      </div>
      <div className="breaker-well">
        <span className="breaker-lever">
          <i />
        </span>
        <div>
          <strong>
            {locked ? "Masroof" : available ? "Abhi farigh hoon" : "Kaam nahi le raha"}
          </strong>
          <small>
            {locked
              ? "Confirmed job ke dauran badal nahi sakte"
              : available
                ? "Customers aap ko dekh sakte hain"
                : "Toggle ko upar karein"}
          </small>
        </div>
      </div>
    </button>
  );
}

function WorkerHome({
  available,
  setAvailable,
  booked,
  t,
  onRequest,
}: {
  available: boolean;
  setAvailable: (v: boolean) => void;
  booked: boolean;
  t: typeof copy.roman;
  onRequest: () => void;
}) {
  return (
    <>
      <div className="home-greeting">
        <div>
          <span>ASSALAM-O-ALAIKUM</span>
          <h1>Aslam ustad</h1>
        </div>
        <img src={workerPhoto} alt="Aslam Khan, electrician" />
      </div>
      <AvailabilityBreaker available={available} setAvailable={setAvailable} locked={booked} />
      <div className="instruction-strip">
        <SpeakerButton
          text={
            booked
              ? t.busy
              : available
                ? "Aap abhi farigh hain. Naya kaam aane par ghanti bajay gi."
                : "Naye kaam ke liye breaker on karein."
          }
        />
        <p>
          {booked
            ? "Toggle active booking ki wajah se locked hai."
            : available
              ? "Aap ka profile G-9 ke customers ko nazar aa raha hai."
              : "Kaam lene ke liye bara switch on karein."}
        </p>
      </div>
      <div className="section-title">
        <div>
          <span>INCOMING</span>
          <h2>Naya kaam</h2>
        </div>
        <span className="count-badge">{available ? 1 : 0}</span>
      </div>
      {available && !booked ? (
        <div className="request-card">
          <div className="request-head">
            <div className="fatima-avatar">F</div>
            <div>
              <b>Fatima R.</b>
              <small>
                <MapPin size={13} /> G-9 · 1.2 km
              </small>
            </div>
            <span>NOW</span>
          </div>
          <div className="request-category">
            <Zap size={18} /> Fan & switch · Bijli
          </div>
          <AudioNote
            text="Ceiling fan dheema chal raha hai aur switch garam hota hai."
            time="0:12"
          />
          <button className="primary-button full" onClick={onRequest}>
            <Ear size={20} /> Sunein aur jawab dein
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <Bell />
          <b>{booked ? "Aik kaam jaari hai" : "Aap offline hain"}</b>
          <p>
            {booked
              ? "Naya immediate request lock ke dauran nahi aa sakta."
              : "Breaker on hote hi qareebi requests yahan aayengi."}
          </p>
        </div>
      )}
    </>
  );
}

function Discovery({
  selectedTrade,
  setSelectedTrade,
  selectedFilters,
  setSelectedFilters,
  available,
  onProfile,
  onOffline,
}: {
  selectedTrade: number;
  setSelectedTrade: (n: number) => void;
  selectedFilters: string[];
  setSelectedFilters: (v: string[]) => void;
  available: boolean;
  onProfile: () => void;
  onOffline: () => void;
}) {
  const filters = ["Available now", "Under 2 km", "4.5+ rating"];
  return (
    <>
      <PageHeading
        eyebrow="G-9 · ISLAMABAD"
        title="Kya theek karwana hai?"
        text="Tasveer chunein ya awaaz mein masla batayein."
      />
      <div className="discovery-tools">
        <div className="mini-trades">
          {trades.map((trade, i) => {
            const Icon = trade.icon;
            return (
              <button
                key={trade.name}
                className={i === selectedTrade ? "selected" : ""}
                onClick={() => setSelectedTrade(i)}
              >
                <Icon />
                <span>{trade.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
        <button
          className="voice-orb"
          onClick={() => speak("Button daba kar apna masla bol kar batayein.")}
        >
          <span>
            <Mic />
          </span>
          <div>
            <b>Masla awaaz mein batayein</b>
            <small>AI category suggest karega</small>
          </div>
          <Waveform />
        </button>
      </div>
      <div className="filter-row">
        {filters.map((f) => (
          <button
            key={f}
            className={selectedFilters.includes(f) ? "active" : ""}
            onClick={() =>
              setSelectedFilters(
                selectedFilters.includes(f)
                  ? selectedFilters.filter((x) => x !== f)
                  : [...selectedFilters, f],
              )
            }
          >
            {f === "Available now" && <span className="filter-dot" />}
            {f}
          </button>
        ))}
        <button aria-label="More filters">
          <SlidersHorizontal size={17} />
        </button>
      </div>
      <div className="result-count">
        <b>{available ? "3 workers available now" : "2 workers nearby"}</b>
        <span>Distance estimated</span>
      </div>
      <WorkerCard available={available} onClick={onProfile} />
      <div className="worker-card muted-card">
        <div className="worker-photo fallback">
          <span>IK</span>
          <i />
        </div>
        <div className="worker-summary">
          <div className="worker-name">
            <div>
              <h3>Imran Khalid</h3>
              <span>Electrician</span>
            </div>
            <div className="rating">
              <Star fill="currentColor" /> 4.6
            </div>
          </div>
          <p>UPS · circuit breaker · wiring</p>
          <div className="worker-stats">
            <span>
              <MapPin /> 2.1 km
            </span>
            <span>
              <BriefcaseBusiness /> 31 jobs
            </span>
          </div>
        </div>
        <button className="view-button" onClick={onOffline}>
          Not available · Save request
        </button>
      </div>
    </>
  );
}

function WorkerCard({ available, onClick }: { available: boolean; onClick: () => void }) {
  return (
    <div className="worker-card featured">
      <div className="worker-photo">
        <img src={workerPhoto} alt="Aslam Khan, local electrician" />
        <span className={available ? "available" : ""} />
      </div>
      <div className="worker-summary">
        <div className="worker-name">
          <div>
            <h3>Aslam Khan</h3>
            <span>Electrician · Bijli ustad</span>
          </div>
          <div className="rating">
            <Star fill="currentColor" /> 4.9
          </div>
        </div>
        <p>Fans · switches · home wiring</p>
        <div className="worker-stats">
          <span>
            <MapPin /> G-9 · 1.2 km
          </span>
          <span>
            <BriefcaseBusiness /> 47 jobs
          </span>
        </div>
        <div className="estimate">
          Starting labour estimate <b>PKR 1,500</b>
        </div>
      </div>
      <div className={`availability-line ${available ? "available" : ""}`}>
        <span />{" "}
        {available
          ? "Available now · usually replies in 3 min"
          : "Not taking jobs · request for later"}
      </div>
      <button className="view-button" onClick={onClick}>
        View and discuss <ArrowRight size={18} />
      </button>
    </div>
  );
}

function WorkerProfile({
  available,
  onBack,
  onDiscuss,
}: {
  available: boolean;
  onBack: () => void;
  onDiscuss: () => void;
}) {
  return (
    <>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft /> Back to workers
      </button>
      <div className="profile-hero">
        <div className="profile-photo">
          <img src={workerPhoto} alt="Aslam Khan" />
          <span className={available ? "available" : ""} />
        </div>
        <div>
          <div className="eyebrow">ELECTRICIAN · G-9</div>
          <h1>Aslam Khan</h1>
          <p>Fans · switches · home wiring</p>
        </div>
      </div>
      <div className="evidence-grid">
        <div>
          <Star fill="currentColor" />
          <b>4.9</b>
          <small>28 platform reviews</small>
        </div>
        <div>
          <BriefcaseBusiness />
          <b>47</b>
          <small>completed platform jobs</small>
        </div>
        <div>
          <Clock3 />
          <b>10 years</b>
          <small>self-reported experience</small>
        </div>
      </div>
      <div className="profile-section">
        <div className="section-title">
          <div>
            <span>VOICE INTRO</span>
            <h2>Aslam se sunein</h2>
          </div>
          <SpeakerButton text="Main Aslam hoon. Das saal se electrician ka kaam karta hoon." />
        </div>
        <AudioNote
          text="Main Aslam hoon. Das saal se electrician ka kaam karta hoon..."
          time="0:19"
        />
      </div>
      <div className="profile-section">
        <div className="section-title">
          <div>
            <span>PLATFORM EVIDENCE</span>
            <h2>Customer voice reviews</h2>
          </div>
        </div>
        <AudioNote text="Waqt par aaye aur fan bohat achi tarah theek kiya." time="0:11" />
        <div className="review-meta">
          <b>Fatima R.</b>
          <span>Completed job RR-2312-089</span>
        </div>
      </div>
      <div className="sticky-cta">
        <p>
          <b>Estimate: PKR 1,500+</b>
          <span>Final price discussion ke baad</span>
        </p>
        <button onClick={onDiscuss}>
          <MessageCircleMore /> Discuss this job
        </button>
      </div>
    </>
  );
}

function Conversation({ onContinue, offline }: { onContinue: () => void; offline: boolean }) {
  const [recorded, setRecorded] = useState(false);
  return (
    <>
      <div className="conversation-head">
        <div className="mini-profile">
          <img src={workerPhoto} alt="" />
          <span />
        </div>
        <div>
          <span>DISCUSSING WITH</span>
          <h1>Aslam Khan</h1>
          <small>Both can hear the same scope</small>
        </div>
        <button>
          <Phone />
        </button>
      </div>
      <div className="scope-chip">
        <Zap /> Fan dheema + switch garam{" "}
        <button>
          <Volume2 />
        </button>
      </div>
      <div className="messages">
        <div className="day-divider">TODAY · Voice notes are private</div>
        <AudioNote text="Ceiling fan dheema chal raha hai aur switch garam hota hai." time="0:12" />
        <AudioNote
          mine
          text="Main aaj aa sakta hoon. Fan aur switch check kar ke labour 2,500 hogi."
          time="0:16"
        />
        {offline && (
          <div className="retry-note">
            <WifiOff /> Not sent · your recording is safe <button>Retry</button>
          </div>
        )}
      </div>
      <div className="record-composer">
        {recorded ? (
          <>
            <button className="delete-recording" onClick={() => setRecorded(false)}>
              <Trash2 />
            </button>
            <div className="record-preview">
              <button>
                <Play fill="currentColor" />
              </button>
              <Waveform />
              <b>0:08</b>
            </div>
            <button className="send-recording" onClick={onContinue}>
              <ArrowRight />
            </button>
          </>
        ) : (
          <VoiceChamber compact onComplete={() => setRecorded(true)} />
        )}
        <p>{recorded ? "Pehle sunein, phir bhejein" : "Daba kar bolein · release to stop"}</p>
      </div>
      <button className="agreement-shortcut" onClick={onContinue}>
        <span>
          <BadgeCheck /> Scope & price proposal
        </span>
        <ChevronRight />
      </button>
    </>
  );
}

function Agreement({
  accepted,
  onAccept,
  onContinue,
}: {
  accepted: boolean;
  onAccept: () => void;
  onContinue: () => void;
}) {
  const [materials, setMaterials] = useState(false);
  const [read, setRead] = useState(false);
  const proposal =
    "Fan ki service aur garam switch ki replacement. Labour qeemat do hazaar paanch sau rupay. Material shamil nahi.";
  return (
    <>
      <PageHeading
        eyebrow="EXPLICIT AGREEMENT"
        title="Kaam aur qeemat"
        text="AI ne draft banaya. Sirf aap accept kar sakte hain."
      />
      <div className={`agreement-card ${accepted ? "accepted" : ""}`}>
        <div className="agreement-top">
          <div>
            <span>PROPOSAL FROM ASLAM</span>
            <b>{accepted ? "ACCEPTED" : "WAITING FOR FATIMA"}</b>
          </div>
          <span className="seal">{accepted ? <Check /> : <Clock3 />}</span>
        </div>
        <div className="scope-block">
          <span>JOB SCOPE</span>
          <h2>Fan service + hot switch replacement</h2>
          <small>
            <MapPin /> Approx. area: G-9, Islamabad
          </small>
        </div>
        <div className="price-block">
          <span>AGREED LABOUR</span>
          <strong>
            <small>PKR</small> 2,500
          </strong>
        </div>
        <button
          className={`material-toggle ${materials ? "on" : ""}`}
          onClick={() => setMaterials(!materials)}
        >
          <span className="toggle-knob" />
          <div>
            <b>Materials {materials ? "included" : "excluded"}</b>
            <small>Labour price remains PKR 2,500</small>
          </div>
        </button>
        <div className="agreement-details">
          <div>
            <span>Timing</span>
            <b>Now · today</b>
          </div>
          <div>
            <span>Proposal</span>
            <b>Aslam · Worker</b>
          </div>
        </div>
        <button
          className="read-agreement"
          onClick={() => {
            speak(proposal);
            setRead(true);
          }}
        >
          <Volume2 /> {read ? "Dobara sunein" : "Puri agreement sunain"}
        </button>
      </div>
      {!accepted ? (
        <div className="agreement-actions">
          <button className="change-button">
            <RotateCcw /> Change mangain
          </button>
          <button className="accept-button" onClick={onAccept}>
            <Check /> Qeemat manzoor hai
          </button>
        </div>
      ) : (
        <button className="bottom-action success" onClick={onContinue}>
          <span>Booking tasdeeq dekhein</span>
          <ArrowRight />
        </button>
      )}
      <p className="safety-copy">
        <CircleAlert /> AI kabhi price set ya accept nahi karta. Revision se purani acceptance foran
        invalid ho gi.
      </p>
    </>
  );
}

function ActiveJob({
  role,
  started,
  finished,
  conflict,
  setConflict,
  onStart,
  onFinish,
  onReview,
  onFindAnother,
}: {
  role: Role;
  started: boolean;
  finished: boolean;
  conflict: boolean;
  setConflict: (v: boolean) => void;
  onStart: () => void;
  onFinish: () => void;
  onReview: () => void;
  onFindAnother: () => void;
}) {
  const activeStep = finished ? 4 : started ? 3 : 2;
  return (
    <>
      <div className="confirmation-hero">
        <div className="confirmation-seal">
          <Check />
        </div>
        <span>ATOMICALLY CONFIRMED</span>
        <h1>{finished ? "Kaam mukammal" : "Booking tasdeeq ho gayi"}</h1>
        <p>Dono taraf ek hi record nazar aa raha hai.</p>
      </div>
      <div className="booking-ticket">
        <div className="ticket-head">
          <span>BOOKING ID</span>
          <b dir="ltr">RR-2408-117</b>
        </div>
        <div>
          <span>Scope</span>
          <b>Fan + switch repair</b>
        </div>
        <div>
          <span>Labour</span>
          <b>PKR 2,500</b>
        </div>
        <div>
          <span>Area</span>
          <b>G-9, Islamabad</b>
        </div>
      </div>
      <div className="lifecycle">
        {["Requested", "Discussing", "Confirmed", "In progress", "Completed"].map((label, i) => (
          <div key={label} className={i <= activeStep ? "done" : ""}>
            <span>{i < activeStep ? <Check /> : i + 1}</span>
            <b>{label}</b>
          </div>
        ))}
      </div>
      <div className="next-step-card">
        <span>NEXT · {role.toUpperCase()}</span>
        <h2>
          {finished
            ? "Fatima completion confirm karein"
            : started
              ? "Kaam mukammal hone par batayein"
              : "Pohanch kar job start karein"}
        </h2>
        {role === "worker" && !started && (
          <button className="primary-button full" onClick={onStart}>
            <Wrench /> Main pohanch gaya · Start
          </button>
        )}
        {role === "worker" && started && !finished && (
          <button className="primary-button full" onClick={onFinish}>
            <Check /> Kaam mukammal
          </button>
        )}
        {(finished || role === "customer") && (
          <button className="primary-button full" onClick={onReview}>
            <Star /> Completion confirm + Review
          </button>
        )}
      </div>
      <button className="conflict-trigger" onClick={() => setConflict(true)}>
        <Code2 /> Judge demo: Simulate 2nd customer booking attempt
      </button>
      {conflict && (
        <div className="conflict-card">
          <div>
            <CircleAlert />
            <span>
              <b>This worker has just accepted another job</b>
              <p>Your scope and voice request are still saved.</p>
            </span>
            <button onClick={() => setConflict(false)}>
              <X />
            </button>
          </div>
          <button onClick={onFindAnother}>
            <Search /> Find another worker
          </button>
        </div>
      )}
    </>
  );
}

function Review({
  rating,
  setRating,
  reviewed,
  onSubmit,
  onHome,
}: {
  rating: number;
  setRating: (v: number) => void;
  reviewed: boolean;
  onSubmit: () => void;
  onHome: () => void;
}) {
  const [tags, setTags] = useState(["Waqt par aaye", "Saaf kaam"]);
  if (reviewed)
    return (
      <div className="review-success">
        <div className="reputation-orb">
          <Star fill="currentColor" />
          <span>4.9</span>
        </div>
        <div className="eyebrow">TRUST LOOP COMPLETE</div>
        <h1>Shukriya, Fatima</h1>
        <p>Aap ka feedback Aslam ke platform record mein add ho gaya.</p>
        <div className="update-list">
          <div>
            <Check />
            <span>
              <b>48 completed jobs</b>
              <small>47 se barh kar 48</small>
            </span>
          </div>
          <div>
            <Check />
            <span>
              <b>Rating updated: 4.9</b>
              <small>29 platform reviews</small>
            </span>
          </div>
          <div>
            <Check />
            <span>
              <b>Available now</b>
              <small>Booking lock khul gaya</small>
            </span>
          </div>
        </div>
        <button className="bottom-action success" onClick={onHome}>
          <span>Aslam ka synced home dekhein</span>
          <ArrowRight />
        </button>
      </div>
    );
  return (
    <>
      <PageHeading
        eyebrow="LAST STEP"
        title="Kaam kaisa hua?"
        text="Sitaray chunein, alfaaz chunein, ya awaaz mein review dein."
      />
      <div className="rating-selector" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className={n <= rating ? "active" : ""} onClick={() => setRating(n)}>
            <Star fill={n <= rating ? "currentColor" : "none"} />
            <span>{n}</span>
          </button>
        ))}
      </div>
      <div className="spoken-rating">
        <SpeakerButton text={`${rating} sitaray chune gaye hain.`} />
        <b>{rating === 5 ? "Bohat acha kaam" : `${rating} sitaray`}</b>
      </div>
      <div className="review-tags">
        {["Waqt par aaye", "Saaf kaam", "Achi baat cheet", "Qeemat wazeh thi"].map((tag) => (
          <button
            key={tag}
            className={tags.includes(tag) ? "selected" : ""}
            onClick={() =>
              setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])
            }
          >
            {tags.includes(tag) && <Check />}
            {tag}
          </button>
        ))}
      </div>
      <div className="voice-review">
        <div>
          <span>OPTIONAL VOICE REVIEW</span>
          <b>Awaaz mein kuch kehna chahein?</b>
        </div>
        <VoiceChamber compact />
      </div>
      <button className="bottom-action success" onClick={onSubmit}>
        <span>Review jama karein</span>
        <ArrowRight />
      </button>
      <p className="availability-note">
        <Sparkles /> Submit karte hi Aslam phir “Available Now” ho jayega.
      </p>
    </>
  );
}

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            className="drawer-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Close drawer"
          />
          <motion.aside
            className="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            dir="ltr"
          >
            <div className="drawer-head">
              <div>
                <span>ROSHAN ROZGAR</span>
                <h2>{title}</h2>
              </div>
              <button onClick={onClose}>
                <X />
              </button>
            </div>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Annotation({
  icon: Icon,
  title,
  text,
  code,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
  code: string;
}) {
  return (
    <div className="annotation">
      <span>
        <Icon />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
        <code>{code}</code>
      </div>
    </div>
  );
}

export default App;
