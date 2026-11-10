import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  MapPin,
  MessageCircle,
  Search,
  Star,
  Sun,
  Wrench,
  Zap,
  Droplets,
  Wind,
  Hammer,
  Settings,
} from "lucide-react";
import { api, upload, type User, type Profile, type Job } from "./api";
import { Recorder, ReadAloud } from "./Recorder";
type Lang = "en" | "roman" | "ur";
type Screen = "welcome" | "discover" | "profile" | "jobs" | "detail" | "conversation" | "auth";
type RouteContext = { id?: string; role?: User["role"] };
function readRoute(): { screen: Screen; id?: string; role?: User["role"] } {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/discover") return { screen: "discover" };
  if (path === "/profile") return { screen: "profile" };
  if (path === "/jobs") return { screen: "jobs" };
  if (path.startsWith("/workers/")) return { screen: "detail", id: path.slice(9) };
  if (path.startsWith("/requests/")) return { screen: "conversation", id: path.slice(10) };
  if (path === "/auth/worker") return { screen: "auth", role: "worker" };
  if (path === "/auth/customer") return { screen: "auth", role: "customer" };
  return { screen: "welcome" };
}
const trades = ["Electrician", "Plumber", "AC technician", "Carpenter", "Mechanic"];
const areas = ["G-9", "G-10", "F-10", "I-8", "Satellite Town", "Saddar"];
const icons = [Zap, Droplets, Wind, Hammer, Settings];
const copy = {
  en: {
    title: "Good work. Close to home.",
    intro: "Find the right hands for your home. Put your skills to work in your neighbourhood.",
    find: "Find a worker",
    offer: "Offer my services",
    jobs: "My requests",
    profile: "My profile",
  },
  roman: {
    title: "Hunar nazar aaye. Rozgar mil jaye.",
    intro: "Apne ilaqay mein sahi ustad dhoondein. Apne hunar se rozgar kamayein.",
    find: "Ustad dhoondein",
    offer: "Main kaam karta hoon",
    jobs: "Meray kaam",
    profile: "Mera profile",
  },
  ur: {
    title: "ہنر نظر آئے، روزگار مل جائے۔",
    intro: "اپنے علاقے میں ہنر مند کاریگر ڈھونڈیں۔ اپنے ہنر سے روزگار کمائیں۔",
    find: "کاریگر ڈھونڈیں",
    offer: "میں کام کرتا ہوں",
    jobs: "میرے کام",
    profile: "میرا پروفائل",
  },
};
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Heading({ tag, title, children }: { tag: string; title: string; children?: ReactNode }) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{tag}</p>
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
function Form({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          await onSubmit(data);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {busy && <p role="status">Saving…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
function Auth({ role, onDone }: { role: User["role"]; onDone: (user: User) => void }) {
  const [login, setLogin] = useState(false);
  return (
    <section className="card auth">
      <Heading
        tag="YOUR NEIGHBOURHOOD, YOUR ACCOUNT"
        title={
          login
            ? "Welcome back."
            : role === "worker"
              ? "Let’s get you working."
              : "A helping hand starts here."
        }
      >
        Local MVP account · no identity verification claimed.
      </Heading>
      <Form
        onSubmit={async (d) =>
          onDone(
            await api<User>("/auth/" + (login ? "login" : "register"), {
              username: d.get("username"),
              password: d.get("password"),
              role,
            }),
          )
        }
      >
        <Field label="Username">
          <input name="username" autoComplete="username" required maxLength={64} />
        </Field>
        <Field label="Password (at least 10 characters)">
          <input
            name="password"
            type="password"
            autoComplete={login ? "current-password" : "new-password"}
            minLength={10}
            maxLength={128}
            required
          />
        </Field>
        <button>
          {login ? "Sign in" : "Create " + role + " account"}
          <ArrowRight size={18} />
        </button>
      </Form>
      <button className="text-button" onClick={() => setLogin(!login)}>
        {login ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
function ProfileEditor({
  profile,
  onSaved,
  lang,
}: {
  profile: Profile | null;
  onSaved: () => Promise<void>;
  lang: Lang;
}) {
  const [name, setName] = useState(profile?.name || ""),
    [trade, setTrade] = useState(profile?.trade || trades[0]),
    [years, setYears] = useState(profile?.years_experience?.toString() || ""),
    [services, setServices] = useState(profile?.services.join("\n") || ""),
    [selected, setSelected] = useState<string[]>(profile?.areas || []),
    [available, setAvailable] = useState(profile?.manual_available ?? true),
    [transcript, setTranscript] = useState(""),
    [uncertain, setUncertain] = useState<string[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [saved, setSaved] = useState(false);
  const draft = `${name}. ${trade}. ${years ? years + " years experience." : ""} ${services}. Service areas: ${selected.join(", ")}.`;
  return (
    <>
      <Heading tag="YOUR SKILLS, YOUR LIVELIHOOD" title="Tell your story.">
        اپنا نام، تجربہ اور کام بتائیں · Record in Urdu, then check your draft.
      </Heading>
      <div className="editor-grid">
        <section className="card">
          <h2>Start with your voice</h2>
          <ReadAloud
            language="ur"
            text="اپنا نام بتائیں، آپ کتنے سال سے کام کر رہے ہیں، اور کون سے کام کرتے ہیں؟"
          />
          <Recorder
            label="Transcribe my profile"
            onSend={async (blob) => {
              const audio_id = await upload(blob);
              const result = await api<{
                transcript: string;
                draft: {
                  name: string | null;
                  years_experience: number | null;
                  services: string[];
                  uncertain_fields: string[];
                };
              }>("/ai/transcribe-profile", { audio_id });
              setName(result.draft.name || "");
              setYears(result.draft.years_experience?.toString() || "");
              setServices(result.draft.services.join("\n"));
              setTranscript(result.transcript);
              setUncertain(result.draft.uncertain_fields);
              setConfirmed(false);
            }}
          />
          <p className="muted">
            Optional: recording is sent to the server. Transcription sends it to OpenAI only when
            configured. You can enter the same details manually.
          </p>
          {transcript && (
            <div className="notice">
              <b>Automatically transcribed — please check</b>
              <p>{transcript}</p>
            </div>
          )}
          {uncertain.length > 0 && (
            <p className="notice">
              Please check: {uncertain.join(", ")}. Unknown experience can stay blank.
            </p>
          )}
        </section>
        <section className="card">
          <h2>Review your profile</h2>
          <Form
            onSubmit={async () => {
              if (!confirmed) throw new Error("Please confirm that these details are correct.");
              if (!selected.length) throw new Error("Choose at least one service area.");
              await api("/profile", {
                name,
                trade,
                years_experience: years === "" ? null : Number(years),
                services: services
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                areas: selected,
                manual_available: available,
                language: lang,
              });
              await onSaved();
              setSaved(true);
            }}
          >
            <div
              onChange={() => {
                setConfirmed(false);
                setSaved(false);
              }}
            >
              <Field label="Your name / آپ کا نام">
                <input
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Your trade / ہنر">
                <select value={trade} onChange={(e) => setTrade(e.target.value)}>
                  {trades.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Years of experience (leave blank if unknown)">
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                />
              </Field>
              <Field label="Services — one per line / آپ کے کام">
                <textarea required value={services} onChange={(e) => setServices(e.target.value)} />
              </Field>
              <p className="field-title">Where do you work? / آپ کے علاقے</p>
              <div className="chips">
                {areas.map((a) => (
                  <button
                    type="button"
                    aria-pressed={selected.includes(a)}
                    className={selected.includes(a) ? "chip selected" : "chip"}
                    key={a}
                    onClick={() => {
                      setSelected(
                        selected.includes(a) ? selected.filter((x) => x !== a) : [...selected, a],
                      );
                      setConfirmed(false);
                    }}
                  >
                    {selected.includes(a) && <Check size={15} />} {a}
                  </button>
                ))}
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                />
                Available for new work / کام کے لیے دستیاب
              </label>
            </div>
            <ReadAloud text={draft} language={lang} />
            <label className="check">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I checked these details and want to publish them.
            </label>
            <button>
              Publish profile <ArrowRight size={18} />
            </button>
            {saved && (
              <p role="status" className="success">
                Profile saved and published.
              </p>
            )}
          </Form>
        </section>
      </div>
    </>
  );
}
function Discovery({ onSelect, revision }: { onSelect: (p: Profile) => void; revision: number }) {
  const [area, setArea] = useState("G-9"),
    [trade, setTrade] = useState("Electrician"),
    [free, setFree] = useState(true),
    [workers, setWorkers] = useState<Profile[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api<Profile[]>(
      `/workers?area=${encodeURIComponent(area)}&trade=${encodeURIComponent(trade)}${free ? "&available=now" : ""}`,
    )
      .then((rows) => {
        if (live) setWorkers(rows);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [area, trade, free, revision]);
  return (
    <>
      <Heading tag="ISLAMABAD & RAWALPINDI" title="The right hands. Nearby.">
        Choose your area and the kind of help you need.
      </Heading>
      <section className="search-panel">
        <Field label="Your neighbourhood">
          <div className="input-icon">
            <MapPin size={20} />
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        </Field>
        <div className="trade-grid">
          {trades.map((t, i) => {
            const Icon = icons[i];
            return (
              <button
                key={t}
                className={trade === t ? "trade selected" : "trade"}
                aria-pressed={trade === t}
                onClick={() => setTrade(t)}
              >
                <Icon />
                <span>{t}</span>
              </button>
            );
          })}
        </div>
        <label className="check">
          <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} />
          Show only available workers
        </label>
      </section>
      <div className="section-heading">
        <h2>
          {loading
            ? "Finding workers…"
            : `${workers.length} ${workers.length === 1 ? "worker" : "workers"} in ${area}`}
        </h2>
        <span className="muted">Matched by service area</span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="worker-grid">
        {!loading && !workers.length && !error && (
          <div className="card empty">
            <Search />
            <h2>No workers here yet.</h2>
            <p>Try another trade or neighbourhood, or turn off the availability filter.</p>
          </div>
        )}
        {workers.map((w) => (
          <button className="worker-card" key={w.user_id} onClick={() => onSelect(w)}>
            <div className="worker-card-top">
              <span className="avatar">{w.name.slice(0, 1)}</span>
              <span className={"pill " + (w.available ? "green" : "")}>
                {w.available ? "Available now" : "Not available now"}
              </span>
            </div>
            <h2>{w.name}</h2>
            <p>
              {w.trade}
              {w.years_experience !== null ? ` · ${w.years_experience} years experience` : ""}
            </p>
            <p className="muted">{w.services.join(" · ")}</p>
            <div className="rating">
              <Star size={17} />
              {w.review_count
                ? `${Number(w.rating).toFixed(1)} · ${w.review_count} reviews`
                : "No reviews yet"}
            </div>
            <div className="card-footer">
              <span>Serves {area} · Trade match</span>
              <ArrowRight size={20} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
function WorkerDetail({
  worker,
  user,
  onRequest,
  onAuth,
}: {
  worker: Profile;
  user: User | null;
  onRequest: (job: Job) => void;
  onAuth: () => void;
}) {
  const [profile, setProfile] = useState(worker),
    [error, setError] = useState("");
  useEffect(() => {
    api<Profile>("/workers/" + worker.user_id)
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, [worker.user_id]);
  return (
    <section className="card detail">
      <span className="avatar large">{profile.name.slice(0, 1)}</span>
      <Heading tag={profile.trade.toUpperCase()} title={profile.name}>
        {profile.available
          ? "Available for a new job"
          : "Currently unavailable — you may still send a request"}
      </Heading>
      {error && <p className="error">{error}</p>}
      <div className="stats">
        <div>
          <strong>{profile.completed_jobs}</strong>
          <span>Completed jobs</span>
        </div>
        <div>
          <strong>{profile.review_count ? Number(profile.rating).toFixed(1) : "—"}</strong>
          <span>{profile.review_count} reviews</span>
        </div>
        <div>
          <strong>{profile.years_experience ?? "—"}</strong>
          <span>Years of experience</span>
        </div>
      </div>
      <h2>How I can help</h2>
      <ul>
        {profile.services.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p>
        <MapPin size={16} /> {profile.areas.join(" · ")}
      </p>
      <h2>Request this worker</h2>
      {!user ? (
        <button onClick={onAuth}>
          Sign in to request <ArrowRight size={18} />
        </button>
      ) : user.role !== "customer" ? (
        <p className="notice">Only customer accounts can send job requests.</p>
      ) : (
        <Form
          onSubmit={async (d) =>
            onRequest(
              await api<Job>("/requests", {
                worker_id: profile.user_id,
                area: d.get("area"),
                description: d.get("description"),
              }),
            )
          }
        >
          <Field label="Job area">
            <select name="area">
              {profile.areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="What needs fixing?">
            <textarea
              name="description"
              required
              maxLength={2000}
              placeholder="For example: my ceiling fan is not turning."
            />
          </Field>
          <button>
            Send job request <ArrowRight size={18} />
          </button>
          <p className="muted">A request is not a booking. Review and accept a price first.</p>
        </Form>
      )}
      <h2>Customer feedback</h2>
      {profile.reviews?.length ? (
        profile.reviews.map((r, i) => (
          <blockquote key={i}>
            <b>{r.rating}/5</b> {r.feedback || "Rating only"}
          </blockquote>
        ))
      ) : (
        <p className="muted">No reviews yet. Feedback comes from completed jobs.</p>
      )}
    </section>
  );
}
function Conversation({
  job,
  user,
  onRefresh,
  onFind,
}: {
  job: Job;
  user: User;
  onRefresh: () => Promise<void>;
  onFind: () => void;
}) {
  const isWorker = user.id === job.worker_id,
    canCancel = user.id === job.customer_id,
    canDecline = user.id === job.worker_id,
    p = job.proposals[0],
    b = job.booking,
    open = ["requested", "discussing"].includes(job.status);
  const [message, setMessage] = useState(""),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false);
  const mutate = async (path: string, data: unknown) => {
    await api(path, data);
    await onRefresh();
  };
  async function action(path: string, data: unknown = {}) {
    setBusy(true);
    setActionError("");
    try {
      await mutate(path, data);
    } catch (e) {
      setActionError((e as Error).message);
      await onRefresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  function acceptKey() {
    const key = `accept:${job.id}:${p.version}`;
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem(key, value);
    }
    return value;
  }
  return (
    <>
      <Heading
        tag={`${job.area} · ${job.status.replaceAll("_", " ")}`}
        title={isWorker ? "Your job request" : `Your request to ${job.worker_name}`}
      >
        {job.description}
      </Heading>
      <div className="editor-grid">
        <section className="card">
          <h2>
            <MessageCircle size={22} /> Conversation
          </h2>
          <p className="muted">Private to you and the other participant.</p>
          <div className="messages">
            {job.messages.length ? (
              job.messages.map((m) => (
                <div key={m.id} className={"message " + (m.sender_id === user.id ? "mine" : "")}>
                  <small>
                    {m.sender_id === user.id ? "You" : isWorker ? "Customer" : "Worker"}
                  </small>
                  {m.body && <p>{m.body}</p>}
                  {m.audio_id && (
                    <audio controls src={"/api/audio/" + m.audio_id} aria-label="Voice message" />
                  )}
                </div>
              ))
            ) : (
              <p className="muted">Start the conversation. A short voice note can help.</p>
            )}
          </div>
          {open && (
            <>
              <Form
                onSubmit={async () => {
                  await mutate(`/requests/${job.id}/messages`, { body: message });
                  setMessage("");
                }}
              >
                <Field label="Message">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={2000}
                  />
                </Field>
                <button>Send message</button>
              </Form>
              <Recorder
                label="Send voice note"
                onSend={async (blob) => {
                  const audio_id = await upload(blob, job.id);
                  await mutate(`/requests/${job.id}/messages`, { audio_id });
                }}
              />
            </>
          )}
        </section>
        <section className="card">
          <h2>Agree before you book.</h2>
          {p ? (
            <div className="proposal">
              <span className="eyebrow">PROPOSAL · VERSION {p.version}</span>
              <p>{p.scope}</p>
              <strong className="price">PKR {p.price_pkr.toLocaleString()}</strong>
              <p>
                {p.materials_included ? "Materials included" : "Labour only · materials excluded"}
              </p>
              <ReadAloud
                text={`${p.scope}. Price ${p.price_pkr} Pakistani rupees. Materials ${p.materials_included ? "included" : "excluded"}.`}
              />
              {!isWorker && open && (
                <button
                  disabled={busy}
                  onClick={() =>
                    action(`/requests/${job.id}/accept`, {
                      version: p.version,
                      idempotency_key: acceptKey(),
                    })
                  }
                >
                  Accept & confirm booking <Check size={18} />
                </button>
              )}
            </div>
          ) : (
            <p className="notice">
              {isWorker
                ? "Send a clear scope and price for the customer to review."
                : "Waiting for the worker to propose a price."}
            </p>
          )}
          {isWorker && open && (
            <Form
              key={p?.version || 0}
              onSubmit={async (d) =>
                mutate(`/requests/${job.id}/proposals`, {
                  scope: d.get("scope"),
                  price_pkr: Number(d.get("price")),
                  materials_included: d.get("materials") === "on",
                })
              }
            >
              <Field label="Scope of work">
                <textarea name="scope" required maxLength={2000} defaultValue={p?.scope || ""} />
              </Field>
              <Field label="Price in PKR">
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  max="10000000"
                  step="1"
                  defaultValue={p?.price_pkr ?? ""}
                />
              </Field>
              <label className="check">
                <input name="materials" type="checkbox" defaultChecked={!!p?.materials_included} />
                Materials included (unchecked = excluded)
              </label>
              <button>{p ? "Send revised proposal" : "Send proposal"}</button>
            </Form>
          )}
          {b && (
            <div className="booking">
              <p className="eyebrow">BOOKING</p>
              <h2>{b.status.replaceAll("_", " ")}</h2>
              <p className="muted">Booking {b.id.slice(0, 8)}</p>
              {isWorker && b.status === "confirmed" && (
                <button disabled={busy} onClick={() => action(`/bookings/${b.id}/start`)}>
                  Start job
                </button>
              )}
              {isWorker && b.status === "in_progress" && !b.worker_marked_done_at && (
                <button disabled={busy} onClick={() => action(`/bookings/${b.id}/worker-finished`)}>
                  Mark work finished
                </button>
              )}
              {b.worker_marked_done_at && b.status === "in_progress" && (
                <p className="notice">
                  Worker marked the job finished. Waiting for customer confirmation.
                </p>
              )}
              {!isWorker && b.status === "in_progress" && b.worker_marked_done_at && (
                <button disabled={busy} onClick={() => action(`/bookings/${b.id}/complete`)}>
                  Confirm job completed
                </button>
              )}
              {!isWorker && b.status === "confirmed" && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => action(`/bookings/${b.id}/cancel`)}
                >
                  Cancel unstarted booking
                </button>
              )}
              {b.status === "completed" && !isWorker && !job.review && (
                <Form
                  onSubmit={async (d) =>
                    mutate(`/bookings/${b.id}/reviews`, {
                      rating: Number(d.get("rating")),
                      feedback: d.get("feedback"),
                    })
                  }
                >
                  <h2>How did it go?</h2>
                  <Field label="Your rating">
                    <select name="rating" defaultValue="5">
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} out of 5
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Your feedback (optional)">
                    <textarea name="feedback" maxLength={2000} />
                  </Field>
                  <button>Publish review</button>
                </Form>
              )}
              {job.review && (
                <p className="success">
                  Review saved: {job.review.rating}/5 · {job.review.feedback}
                </p>
              )}
            </div>
          )}
          {open && (canCancel || canDecline) && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                action(`/requests/${job.id}/${canDecline ? "decline" : "cancel"}`)
              }
            >
              {canDecline ? "Decline request" : "Cancel request"}
            </button>
          )}
          {actionError && (
            <div className="error" role="alert">
              {actionError}
              <button className="secondary" onClick={onFind}>
                Find available workers
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export default function App() {
  const [lang, setLang] = useState<Lang>("en"),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [screen, setScreenState] = useState<Screen>(() => readRoute().screen),
    [role, setRole] = useState<User["role"]>("customer"),
    [profile, setProfile] = useState<Profile | null>(null),
    [jobs, setJobs] = useState<Job[]>([]),
    [selected, setSelected] = useState<Profile | null>(null),
    [jobId, setJobId] = useState(() => {
      const route = readRoute();
      return route.screen === "conversation" ? route.id || "" : "";
    }),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const t = copy[lang];
  function setScreen(next: Screen, context: RouteContext = {}) {
    setScreenState(next);
    const path =
      next === "welcome"
        ? "/"
        : next === "auth"
          ? `/auth/${context.role || role}`
          : next === "detail"
            ? `/workers/${context.id || selected?.user_id || ""}`
            : next === "conversation"
              ? `/requests/${context.id || jobId}`
              : `/${next}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
  }
  const refresh = useCallback(async () => {
    if (!user) return;
    const [j, p] = await Promise.all([
      api<Job[]>("/requests"),
      user.role === "worker" ? api<Profile | null>("/profile") : Promise.resolve(null),
    ]);
    setJobs(j);
    setProfile(p);
    setRevision((v) => v + 1);
  }, [user]);
  useEffect(() => {
    const handlePopState = () => {
      const route = readRoute();
      setScreenState(route.screen);
      if (route.role) setRole(route.role);
      if (route.id && route.screen === "conversation") setJobId(route.id);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    api<{ user: User | null }>("/auth/me")
      .then((r) => {
        setUser(r.user);
        const route = readRoute();
        if (!r.user && ["profile", "jobs", "conversation"].includes(route.screen)) {
          setScreen("welcome");
        } else if (route.screen === "auth") {
          setRole(route.role || "customer");
        } else if (r.user && route.screen === "welcome") {
          setScreen(r.user.role === "worker" ? "profile" : "discover");
        } else if (
          r.user &&
          ((r.user.role === "worker" && route.screen === "discover") ||
            (r.user.role === "customer" && route.screen === "profile"))
        ) {
          setScreen(r.user.role === "worker" ? "profile" : "discover");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!user) return;
    void refresh().catch((e) => setError(e.message));
    const update = () => {
      if (document.visibilityState === "visible") void refresh().catch((e) => setError(e.message));
    };
    const timer = setInterval(update, 10000);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
    };
  }, [user, refresh]);
  useEffect(() => {
    const route = readRoute();
    if (screen !== "detail" || !route.id || selected?.user_id === route.id) return;
    api<Profile>("/workers/" + route.id)
      .then(setSelected)
      .catch((e) => setError(e.message));
  }, [screen, selected?.user_id]);
  useEffect(() => {
    document.documentElement.lang = lang === "ur" ? "ur" : lang === "roman" ? "ur-Latn" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);
  function auth(r: User["role"]) {
    setRole(r);
    setScreen("auth", { role: r });
  }
  const job = jobs.find((j) => j.id === jobId);
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <button
          className="brand"
          onClick={() =>
            setScreen(user ? (user.role === "worker" ? "profile" : "discover") : "welcome")
          }
        >
          <span className="brand-mark">
            <Sun />
          </span>
          <span>
            roshan rozgar<small>روشن روزگار</small>
          </span>
        </button>
        <div className="header-actions">
          <select
            className="language"
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="en">English</option>
            <option value="roman">Roman Urdu</option>
            <option value="ur">اردو</option>
          </select>
          {user ? (
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await api("/auth/logout", {});
                  setUser(null);
                  setJobs([]);
                  setProfile(null);
                  setScreen("welcome");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Sign out
            </button>
          ) : (
            <button className="text-button" onClick={() => auth("customer")}>
              Sign in
            </button>
          )}
        </div>
      </header>
      <div className="local-banner">
        <MapPin size={14} /> ISLAMABAD & RAWALPINDI{" "}
        <span>Local MVP · real persisted accounts and jobs</span>
      </div>
      {user && (
        <nav aria-label="Main navigation">
          {user.role === "customer" ? (
            <button
              className={screen === "discover" ? "active" : ""}
              onClick={() => setScreen("discover")}
            >
              <Search size={18} />
              {t.find}
            </button>
          ) : (
            <button
              className={screen === "profile" ? "active" : ""}
              onClick={() => setScreen("profile")}
            >
              <Wrench size={18} />
              {t.profile}
            </button>
          )}
          <button className={screen === "jobs" ? "active" : ""} onClick={() => setScreen("jobs")}>
            <BriefcaseBusiness size={18} />
            {t.jobs} <span className="count">{jobs.length}</span>
          </button>
          <span className="signed-in">
            {user.username} · {user.role}
          </span>
        </nav>
      )}
      <main id="main">
        {error && (
          <div className="error" role="alert">
            {error}
            <button
              className="text-button"
              onClick={() => {
                setError("");
                void refresh().catch((e) => setError(e.message));
              }}
            >
              Retry
            </button>
          </div>
        )}
        {!ready ? (
          <p role="status">Loading your workspace…</p>
        ) : (
          <>
            {["detail", "conversation", "auth"].includes(screen) && (
              <button
                className="back text-button"
                onClick={() =>
                  setScreen(
                    user
                      ? screen === "conversation"
                        ? "jobs"
                        : user.role === "worker"
                          ? "profile"
                          : "discover"
                      : "welcome",
                  )
                }
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            {screen === "welcome" && (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <p className="eyebrow">LOCAL SKILLS. NEW POSSIBILITIES.</p>
                    <h1>{t.title}</h1>
                    <p>{t.intro}</p>
                    <div className="actions">
                      <button onClick={() => setScreen("discover")}>
                        {t.find}
                        <ArrowRight size={20} />
                      </button>
                      <button className="secondary" onClick={() => auth("worker")}>
                        {t.offer}
                        <Wrench size={20} />
                      </button>
                    </div>
                    <div className="hero-foot">
                      <span>
                        <Check size={17} />
                        Agree on price first
                      </span>
                      <span>
                        <Check size={17} />
                        Reviews from completed jobs
                      </span>
                    </div>
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="sun-disc">
                      <Sun strokeWidth={1} />
                    </div>
                    <div className="arch">
                      <Wrench strokeWidth={1} />
                    </div>
                    <span className="art-label">ہنر سے روشن کل</span>
                    <div className="art-caption">
                      A brighter tomorrow,
                      <br />
                      built by skilled hands.
                    </div>
                  </div>
                </section>
                <section className="steps">
                  <div>
                    <span>01</span>
                    <h2>Find your match</h2>
                    <p>Choose a trade and your neighbourhood.</p>
                  </div>
                  <div>
                    <span>02</span>
                    <h2>Talk it through</h2>
                    <p>Send a voice note. Agree on scope and price.</p>
                  </div>
                  <div>
                    <span>03</span>
                    <h2>Get it done</h2>
                    <p>Confirm the work. Share your experience.</p>
                  </div>
                </section>
              </>
            )}
            {screen === "auth" && (
              <Auth
                role={role}
                onDone={(u) => {
                  setUser(u);
                  setScreen(u.role === "worker" ? "profile" : "discover");
                }}
              />
            )}
            {screen === "discover" && (
              <Discovery
                revision={revision}
                onSelect={(p) => {
                  setSelected(p);
                  setScreen("detail", { id: p.user_id });
                }}
              />
            )}
            {screen === "detail" && selected && (
              <WorkerDetail
                worker={selected}
                user={user}
                onAuth={() => auth("customer")}
                onRequest={(j) => {
                  setJobs((old) => [j, ...old]);
                  setJobId(j.id);
                  setScreen("conversation", { id: j.id });
                }}
              />
            )}
            {screen === "profile" && user && (
              <ProfileEditor
                key={profile?.user_id || "new"}
                profile={profile}
                onSaved={refresh}
                lang={lang}
              />
            )}
            {screen === "jobs" && (
              <>
                <Heading tag="YOUR WORKSPACE" title="Every conversation. Every job.">
                  Requests and bookings stay here when you come back.
                </Heading>
                <div className="job-list">
                  {jobs.length ? (
                    jobs.map((j) => (
                      <button
                        className="job-row"
                        key={j.id}
                        onClick={() => {
                          setJobId(j.id);
                          setScreen("conversation", { id: j.id });
                        }}
                      >
                        <span className="job-icon">
                          <BriefcaseBusiness />
                        </span>
                        <span>
                          <b>{j.description}</b>
                          <small>
                            {j.worker_name} · {j.area}
                          </small>
                        </span>
                        <span className="pill">
                          {j.booking?.status.replaceAll("_", " ") || j.status}
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ))
                  ) : (
                    <div className="card empty">
                      <MessageCircle />
                      <h2>No requests yet.</h2>
                      <p>
                        {user?.role === "worker"
                          ? "Publish your profile so customers can find you."
                          : "Find a worker to start your first conversation."}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            {screen === "conversation" && job && user && (
              <Conversation
                key={job.id}
                job={job}
                user={user}
                onRefresh={refresh}
                onFind={() => setScreen("discover")}
              />
            )}
          </>
        )}
      </main>
      <footer>
        <span>روشن روزگار · Work, with dignity.</span>
        <span>
          No payments or identity verification. Primary actions support Urdu; detailed forms are
          bilingual/English.
        </span>
      </footer>
    </div>
  );
}
