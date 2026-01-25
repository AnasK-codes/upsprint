"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ToastContainer, ToastData, ToastType } from "@/components/Toast";
import { v4 as uuidv4 } from "uuid";

interface ToastContextType {
  toast: (options: {
    title?: string;
    description: string;
    type?: ToastType;
    duration?: number;
  }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({
      description,
      type = "info",
      duration = 5000,
    }: {
      title?: string;
      description: string;
      type?: ToastType;
      duration?: number;
    }) => {
      const id = uuidv4();
      setToasts((prev) => [
        ...prev,
        { id, message: description, type, duration },
      ]);
    },
    [],
  );

  const success = useCallback(
    (message: string) => addToast({ description: message, type: "success" }),
    [addToast],
  );
  const error = useCallback(
    (message: string) => addToast({ description: message, type: "error" }),
    [addToast],
  );
  const info = useCallback(
    (message: string) => addToast({ description: message, type: "info" }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
