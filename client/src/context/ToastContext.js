import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

// toast.success("Saved") / toast.error("Couldn't save"): a short message in the corner of the screen
export function useToast() {
  return useContext(ToastContext);
}
