/** @format */

import { useEffect } from "react";
import { toast } from "sonner";

export type AppToastType = "error" | "warning" | "success" | "info";

export type AppToastPayload = {
  type: AppToastType;
  title?: string;
  description: string;
};

export const APP_TOAST_EVENT = "app:toast";

export const emitApiToast = (payload: AppToastPayload) => {
  window.dispatchEvent(
    new CustomEvent<AppToastPayload>(APP_TOAST_EVENT, {
      detail: payload,
    }),
  );
};

export const useAppToastListener = () => {
  useEffect(() => {
    const onToastEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AppToastPayload>;
      const detail = customEvent.detail;
      if (!detail) return;

      const title = detail.title || "Thông báo";

      if (detail.type === "success") {
        toast.success(title, { description: detail.description });
        return;
      }

      if (detail.type === "warning") {
        toast.warning(title, { description: detail.description });
        return;
      }

      if (detail.type === "info") {
        toast.info(title, { description: detail.description });
        return;
      }

      toast.error(title, { description: detail.description });
    };

    window.addEventListener(APP_TOAST_EVENT, onToastEvent);
    return () => window.removeEventListener(APP_TOAST_EVENT, onToastEvent);
  }, []);
};
