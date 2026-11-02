"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "./overlay";
import { Avatar, cn } from "./ui";

const MAX_SIDE = 512;

function resize(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

export function PhotoInput({ name, src, onUpload }: { name: string; src?: string | null; onUpload: (dataUrl: string) => Promise<void> }) {
  const { t } = useI18n();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(await resize(file));
      toast({ message: t.common.photoSaved });
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      aria-label={t.common.changePhoto}
      className={cn("group relative shrink-0 rounded-full", busy && "opacity-60")}
      disabled={busy}
    >
      <Avatar name={name} src={src} size="lg" />
      <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-primary text-on-primary transition group-hover:scale-110">
        <Camera className="h-3 w-3" />
      </span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void pick(event.target.files?.[0])} />
    </button>
  );
}
