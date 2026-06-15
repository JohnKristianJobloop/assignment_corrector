export const DEFAULT_SERVER = process.env.SERVER_HOST ?? "ws://127.0.0.1:8080";
export const SUBMIT_TERMINAL = new Set(["report", "rejected", "error"]);
export const PUBLISH_TERMINAL = new Set(["published", "rejected", "error"]);