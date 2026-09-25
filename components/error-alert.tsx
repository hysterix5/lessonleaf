import { CircleAlert, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ErrorAlert({ message, title = "Please check this", onDismiss, className }: {
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return <Alert variant="destructive" className={className}>
    <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
    <div className="min-w-0 flex-1"><AlertTitle>{title}</AlertTitle><AlertDescription>{message}</AlertDescription></div>
    {onDismiss && <Button type="button" variant="ghost" size="icon-sm" className="-mr-2 -mt-1 text-inherit" onClick={onDismiss} aria-label="Dismiss error"><X size={15} /></Button>}
  </Alert>;
}
