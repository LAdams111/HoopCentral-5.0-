import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";

export function BackButton({
  fallback = "/",
  className = "mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary",
  label = "Back",
}: {
  fallback?: string;
  className?: string;
  label?: string;
}) {
  const goBack = useGoBack(fallback);

  return (
    <button type="button" onClick={goBack} className={className}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
