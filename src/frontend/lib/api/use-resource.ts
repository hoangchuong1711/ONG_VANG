"use client";
import { useEffect, useState } from "react";
/** Keyed results and cancellation prevent old filters/order routes overwriting newer requests. */
export function useResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{ key: string; data?: T; error?: unknown }>();
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, data }); },
      (error: unknown) => { if (!controller.signal.aborted) setResult({ key, error }); },
    );
    return () => controller.abort();
  }, [key, load]);
  return result?.key === key ? { ...result, loading: false } : { loading: true, data: result?.data, error: undefined };
}
