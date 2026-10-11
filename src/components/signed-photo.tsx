import { useEffect, useState } from "react";
import { getSignedPhotoUrl } from "@/lib/photo";
import { cn } from "@/lib/utils";

/** Muestra una foto privada del bucket care-photos mediante URL firmada (1 h). */
export function SignedPhoto({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSignedPhotoUrl(path).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) {
    return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
