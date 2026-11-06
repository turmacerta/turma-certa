"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useMounted } from "@/lib/client-store";
import { useI18n } from "@/lib/i18n";
import { Button, cn, Field, IconButton } from "./ui";

const BASE_LAYER = 50;
let layers: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useLayer(active: boolean) {
  const id = useId();
  useEffect(() => {
    if (!active) {
      return;
    }
    layers = [...layers, id];
    if (layers.length === 1) {
      document.body.style.overflow = "hidden";
    }
    emit();
    return () => {
      layers = layers.filter((item) => item !== id);
      if (layers.length === 0) {
        document.body.style.overflow = "";
      }
      emit();
    };
  }, [active, id]);
  const stack = useSyncExternalStore(subscribe, () => layers, () => layers);
  const index = stack.indexOf(id);
  return { zIndex: BASE_LAYER + Math.max(index, 0) * 10, isTop: index >= 0 && index === stack.length - 1 };
}

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}

function Portal({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  return mounted ? createPortal(children, document.body) : null;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
}) {
  const { t } = useI18n();
  const layer = useLayer(open);
  const close = useCallback(() => {
    if (dismissible) {
      onClose();
    }
  }, [dismissible, onClose]);
  useEscape(open && layer.isTop, close);

  if (!open) {
    return null;
  }

  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <Portal>
      <div
        className="fixed inset-0 grid items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-4"
        style={{ zIndex: layer.zIndex }}
        onMouseDown={close}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(event) => event.stopPropagation()}
          className={cn(
            "animate-scale-in flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-soft sm:max-h-[88dvh] sm:rounded-3xl",
            width,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6">
            <div className="min-w-0">
              <h2 className="display text-2xl font-semibold">{title}</h2>
              {description ? <div className="mt-1.5 text-sm text-muted">{description}</div> : null}
            </div>
            {dismissible ? (
              <IconButton label={t.common.close} onClick={onClose} className="-mr-2 -mt-1 shrink-0">
                <X className="h-5 w-5" />
              </IconButton>
            ) : null}
          </div>
          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">{children}</div> : null}
          {footer ? (
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>
          ) : (
            <div className="h-4 shrink-0" />
          )}
        </div>
      </div>
    </Portal>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const layer = useLayer(open);
  useEscape(open && layer.isTop, onClose);

  if (!open) {
    return null;
  }

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: layer.zIndex }} onMouseDown={onClose}>
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(event) => event.stopPropagation()}
          className="animate-slide-in absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line bg-surface shadow-soft"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-6">
            <div className="min-w-0">
              <h2 className="display truncate text-2xl font-semibold">{title}</h2>
              {subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
            </div>
            <IconButton label={t.common.close} onClick={onClose} className="-mr-2 shrink-0">
              <X className="h-5 w-5" />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
          {footer ? <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line p-4">{footer}</footer> : null}
        </aside>
      </div>
    </Portal>
  );
}

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  typeToConfirm?: string;
};

type ConfirmRequest = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [typed, setTyped] = useState("");

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setTyped("");
        setRequest({ ...options, resolve });
      }),
    [],
  );

  function settle(value: boolean) {
    request?.resolve(value);
    setRequest(null);
  }

  const danger = request?.tone === "danger";
  const locked = Boolean(request?.typeToConfirm) && typed.trim() !== request?.typeToConfirm;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={Boolean(request)}
        onClose={() => settle(false)}
        title={request?.title ?? ""}
        size="sm"
        description={
          <div className="flex gap-3">
            {danger ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" /> : null}
            <div>{request?.description}</div>
          </div>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {request?.cancelLabel ?? t.common.cancel}
            </Button>
            <Button variant={danger ? "danger" : "primary"} disabled={locked} onClick={() => settle(true)} autoFocus={!request?.typeToConfirm}>
              {request?.confirmLabel ?? t.common.confirm}
            </Button>
          </>
        }
      >
        {request?.typeToConfirm ? (
          <Field
            label={t.common.typeToConfirm(request.typeToConfirm)}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoFocus
            autoComplete="off"
          />
        ) : null}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const value = useContext(ConfirmContext);
  if (!value) {
    throw new Error("useConfirm must be used inside ConfirmProvider");
  }
  return value;
}

type ToastTone = "success" | "error" | "info";
type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
};

type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: ToastTone; duration?: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    ({ duration, tone = "success", ...toast }: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((items) => [...items.slice(-2), { ...toast, tone, id }]);
      window.setTimeout(() => dismiss(id), duration ?? (toast.action ? 6000 : 3500));
    },
    [dismiss],
  );

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success" />,
    error: <XCircle className="h-5 w-5 text-danger" />,
    info: <Info className="h-5 w-5 text-primary dark:text-accent" />,
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <Portal>
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="animate-fade-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-soft"
            >
              {icons[toast.tone]}
              <p className="flex-1 font-medium">{toast.message}</p>
              {toast.action ? (
                <button
                  type="button"
                  className="font-bold text-primary hover:underline dark:text-accent"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}
