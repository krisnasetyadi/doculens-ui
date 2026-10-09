import { useEffect, useState } from "react";

/**
 * True once the app is running in the browser and the login state is known. The auth store reads
 * the token from the browser, so the server-rendered HTML always shows the signed-out page; a
 * signed-in user would see "Sign In / Get Started" until the script loads. Render a placeholder
 * while this is false and the server HTML and the first client render stay the same.
 */
export function useAuthReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
