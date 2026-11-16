/*
 * Whether an order form currently has input that was not submitted yet.
 * Read by the AuthGuard when the session expires (session_expired.had_unsaved_form:
 * "did the token expiry interrupt real work?" — telemetry-plan.md A.16).
 */
let unsaved = false;

export function setUnsavedForm(value: boolean): void {
  unsaved = value;
}

export function hasUnsavedForm(): boolean {
  return unsaved;
}
