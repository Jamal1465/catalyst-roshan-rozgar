export interface User {
  id: string;
  username: string;
  role: "worker" | "customer";
}
export interface Profile {
  has_public_account?: boolean;
  user_id: string;
  name: string;
  trade: string;
  years_experience: number | null;
  services: string[];
  areas: string[];
  manual_available: boolean;
  available: boolean;
  language: string;
  rating: number | null;
  review_count: number;
  completed_jobs: number;
  reviews?: { rating: number; feedback: string }[];
}
export interface Proposal {
  id: string;
  version: number;
  scope: string;
  price_pkr: number;
  materials_included: number;
}
export interface Job {
  id: string;
  worker_id: string;
  worker_name: string;
  customer_id: string;
  area: string;
  description: string;
  status: string;
  messages: { id: string; sender_id: string; body: string | null; audio_id: string | null }[];
  proposals: Proposal[];
  booking: { id: string; status: string; worker_marked_done_at: string | null } | null;
  review: { rating: number; feedback: string; audio_id?: string; tags?: string } | null;
}
const errors: Record<string, string> = {
  WORKER_BUSY:
    "This worker has just accepted another job. Your request is saved. Find another available worker or try again later.",
  STALE_PROPOSAL:
    "The price proposal changed. Refresh and review the latest version before accepting.",
  AI_NOT_CONFIGURED:
    "Voice transcription is not configured. You can choose a trade manually below or retry later.",
  SIGN_IN_REQUIRED: "Please sign in to continue.",
  INVALID_CREDENTIALS: "The username or password is incorrect.",
  USERNAME_TAKEN: "That username is already taken.",
  TRY_AGAIN_LATER: "Too many attempts. Please wait a minute and try again.",
  FORBIDDEN: "This action is not available to the signed-in account.",
};
export async function api<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch("/api" + path, {
    method: data === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(
      errors[json.error] ||
        json.error?.replaceAll("_", " ").toLowerCase() ||
        "Request failed. Please retry.",
    );
  return json as T;
}
export async function upload(
  blob: Blob,
  requestId?: string,
  purpose?: "review" | "triage",
  bookingId?: string,
) {
  const query = new URLSearchParams();
  if (requestId) query.set("request_id", requestId);
  if (purpose === "review") query.set("booking_id", bookingId || "");
  if (purpose === "triage") query.set("purpose", purpose);
  const res = await fetch("/api/audio" + (query.toString() ? "?" + query.toString() : ""), {
    method: "POST",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error.replaceAll("_", " "));
  return json.id as string;
}
