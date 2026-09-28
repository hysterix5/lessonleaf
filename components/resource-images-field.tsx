"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { maxResourceImages, resourceImageBucket, validateResourceImage, type ResourceImage } from "@/lib/resource-images";
import { errorMessage } from "@/lib/feedback";

function Picture({ image, file, onRemove, disabled }: {
  image?: ResourceImage; file?: File; onRemove: () => void; disabled: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const path = image?.path;

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (file) {
      objectUrl = URL.createObjectURL(file);
      const previewUrl = objectUrl;
      queueMicrotask(() => { if (active) { setUrl(previewUrl); setFailed(false); } });
    } else if (path) {
      void getSupabase().storage.from(resourceImageBucket).download(path).then(({ data, error }) => {
        if (!active) return;
        if (error || !data) { setFailed(true); return; }
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      }).catch(() => { if (active) setFailed(true); });
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file, path]);

  const name = image?.name || file?.name || "Resource picture";
  return <div className="resource-picture">
    <a className="resource-picture-preview" href={url || undefined} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`} onClick={(event) => { if (!url) event.preventDefault(); }}>
      {url ? <Image src={url} alt={name} width={112} height={88} unoptimized /> : <span>{failed ? "Preview unavailable" : "Loading picture…"}</span>}
    </a>
    <div className="resource-picture-details"><span title={name}>{name}</span><small>{file ? "Uploads when you save" : "Saved privately"}</small></div>
    <Button type="button" variant="ghost" disabled={disabled} aria-label={`Remove ${name}`} title="Remove picture" onClick={onRemove}><Trash2 size={15} aria-hidden="true" /></Button>
  </div>;
}

export function ResourceImagesField({ userId, images, pending, onAdd, onRemoveSaved, onRemovePending, disabled }: {
  userId?: string;
  images: ResourceImage[];
  pending: File[];
  onAdd: (files: File[]) => void;
  onRemoveSaved: (path: string) => void;
  onRemovePending: (index: number) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const count = images.length + pending.length;

  async function select(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || checking) return;
    setChecking(true);
    setError(null);
    try {
      if (count + files.length > maxResourceImages) throw new Error(`Choose up to ${maxResourceImages} pictures per lesson.`);
      await Promise.all(files.map(validateResourceImage));
      onAdd(files);
    } catch (cause) { setError(errorMessage(cause, "Could not add pictures.")); }
    finally { setChecking(false); }
  }

  return <div className="resource-images-field" aria-label="Resource pictures">
    <div className="resource-images-heading"><div><strong>Resource pictures <span>(optional)</span></strong><p>Add textbook pages or screenshots for this lesson.</p></div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={select} aria-label="Choose resource pictures" />
      <Button type="button" variant="outline" disabled={disabled || checking || count >= maxResourceImages} onClick={() => inputRef.current?.click()}><ImagePlus size={16} aria-hidden="true" /> {checking ? "Checking…" : "Add pictures"}</Button>
    </div>
    {count > 0 && <div className="resource-picture-list">
      {images.map((image) => <Picture key={`${userId}:${image.path}`} image={image} disabled={disabled} onRemove={() => onRemoveSaved(image.path)} />)}
      {pending.map((file, index) => <Picture key={`${index}:${file.name}:${file.size}`} file={file} disabled={disabled} onRemove={() => onRemovePending(index)} />)}
    </div>}
    <small>PNG, JPG, or WebP · up to {maxResourceImages} pictures, 5 MB each. Pictures are saved privately with the lesson{!userId ? " after you sign in" : ""}. They are for reference and are not sent to AI or included in printouts.</small>
    {error && <p className="resource-images-error" role="alert">{error}</p>}
  </div>;
}
