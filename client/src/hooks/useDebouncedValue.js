import { useState, useEffect } from "react";

// Follows `value`, but only after it has stopped changing for `delay` ms (e.g. to wait for typing to pause).
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
