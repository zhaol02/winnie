"use client";

import { Amplify } from "aws-amplify";
import React, { useEffect, useState } from "react";

export default function AmplifyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Block rendering until Amplify is configured so that generateClient calls
  // in child components don't fire before the config arrives. On slow networks
  // the original fire-and-forget useEffect would cause silent empty results.
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    // amplify_outputs.json is copied into public/ by amplify.yml at build time.
    // During local dev, run 'npx ampx sandbox' to generate it first.
    fetch("/amplify_outputs.json")
      .then((res) => {
        if (!res.ok) {
          console.warn(
            `[AmplifyProvider] /amplify_outputs.json returned ${res.status}. ` +
            "Run 'npx ampx sandbox' to generate it for local dev, or check " +
            "that amplify.yml copies it to public/ before the Next.js build."
          );
          return undefined;
        }
        return res.json();
      })
      .then((outputs) => {
        if (outputs) {
          Amplify.configure(outputs, { ssr: true });
        }
      })
      .catch((err) => {
        console.error("[AmplifyProvider] Failed to load Amplify config:", err);
      })
      .finally(() => {
        setConfigured(true);
      });
  }, []);

  if (!configured) {
    // Show nothing until Amplify is configured to prevent data calls firing
    // before config arrives. A short loading indicator is intentionally
    // omitted here — the individual pages manage their own loading states.
    return null;
  }

  return <>{children}</>;
}
