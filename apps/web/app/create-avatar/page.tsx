"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { NatureBackground } from "@/components/ui/nature-background";

type CreateState = "idle" | "pending" | "success" | "conflict" | "error";

interface ApiErrorPayload {
  error?: string;
}

const KOREAN_TEXT = {
  creating: "\uC0DD\uC131 \uC911...",
  created: "\uC0DD\uC131 \uC644\uB8CC",
  alreadyCreated: "\uC774\uBBF8 \uC0DD\uC131\uB428",
  retry: "\uB2E4\uC2DC \uC2DC\uB3C4",
  createStarterAvatar: "\uC2DC\uC791 \uC544\uBC14\uD0C0 \uC0DD\uC131",
  successNotice: "\uC544\uBC14\uD0C0\uAC00 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB0B4 \uBC29\uC73C\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4.",
  successToast: "\uC544\uBC14\uD0C0 \uC0DD\uC131 \uC644\uB8CC!",
  conflictNotice: "\uC774\uBBF8 \uC0DD\uC131\uB41C \uC544\uBC14\uD0C0\uAC00 \uC788\uC5B4\uC694. \uB0B4 \uBC29\uC73C\uB85C \uC774\uB3D9\uD574 \uC8FC\uC138\uC694.",
  defaultError: "\uC544\uBC14\uD0C0 \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
  networkError: "\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC5F0\uACB0\uC744 \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
  pageTitle: "\uC544\uBC14\uD0C0 \uC2DC\uC791\uD558\uAE30",
  pageDescription:
    "\uAE30\uBCF8 \uC544\uC774\uD15C\uC774 \uC790\uB3D9\uC73C\uB85C \uC9C0\uAE09\uB429\uB2C8\uB2E4. \uC0DD\uC131 \uD6C4 \uBC14\uB85C \uB0B4 \uBC29\uC5D0\uC11C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.",
  goHome: "\uB0B4 \uBC29\uC73C\uB85C \uC774\uB3D9"
};

export default function CreateAvatarPage() {
  const router = useRouter();
  const [state, setState] = useState<CreateState>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  const isPending = state === "pending";

  const createButtonLabel = useMemo(() => {
    if (state === "pending") return KOREAN_TEXT.creating;
    if (state === "success") return KOREAN_TEXT.created;
    if (state === "conflict") return KOREAN_TEXT.alreadyCreated;
    if (state === "error") return KOREAN_TEXT.retry;
    return KOREAN_TEXT.createStarterAvatar;
  }, [state]);

  const handleGoHome = () => {
    router.replace("/");
  };

  const handleCreateAvatar = async () => {
    if (isPending || state === "success") {
      return;
    }

    setState("pending");
    setNotice(null);

    try {
      const response = await fetch("/api/avatar/create", {
        method: "POST"
      });

      let payload: ApiErrorPayload | null = null;
      try {
        payload = (await response.json()) as ApiErrorPayload;
      } catch {
        payload = null;
      }

      if (response.ok) {
        setState("success");
        setNotice(KOREAN_TEXT.successNotice);
        toast.success(KOREAN_TEXT.successToast);
        setTimeout(() => handleGoHome(), 650);
        return;
      }

      if (response.status === 409) {
        setState("conflict");
        setNotice(KOREAN_TEXT.conflictNotice);
        return;
      }

      setState("error");
      setNotice(payload?.error ?? KOREAN_TEXT.defaultError);
    } catch {
      setState("error");
      setNotice(KOREAN_TEXT.networkError);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center px-6">
      <NatureBackground variant="meadow" />

      <motion.section
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24 }}
        className="relative z-10 w-full max-w-sm nature-panel p-7 shadow-xl"
      >
        <header className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ghibli-forest text-white shadow-md">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-display font-bold text-ghibli-ink">{KOREAN_TEXT.pageTitle}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ghibli-ink-light">{KOREAN_TEXT.pageDescription}</p>
        </header>

        {notice ? (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
              state === "success"
                ? "border-ghibli-meadow/60 bg-ghibli-meadow/20 text-ghibli-ink"
                : state === "error"
                  ? "border-rose-300 bg-rose-100/80 text-rose-800"
                  : "border-ghibli-cloud-deep bg-ghibli-cloud text-ghibli-ink"
            }`}
          >
            <div className="flex items-start gap-2">
              {state === "success" ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
              <p>{notice}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCreateAvatar}
            disabled={isPending || state === "success"}
            className="w-full rounded-2xl bg-ghibli-forest px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-ghibli-sunset disabled:cursor-not-allowed disabled:bg-ghibli-cloud-deep disabled:text-ghibli-ink-light btn-organic"
          >
            {createButtonLabel}
          </button>

          {(state === "conflict" || state === "success") && (
            <button
              type="button"
              onClick={handleGoHome}
              className="w-full rounded-2xl border border-ghibli-mist bg-ghibli-cloud px-4 py-3 text-sm font-bold text-ghibli-ink shadow-sm transition-colors hover:bg-ghibli-cloud-deep"
            >
              {KOREAN_TEXT.goHome}
            </button>
          )}
        </div>
      </motion.section>
    </div>
  );
}
