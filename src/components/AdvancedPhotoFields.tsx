"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ISO_OPTIONS,
  APERTURE_OPTIONS,
  SHUTTER_OPTIONS,
} from "@/config/photo-settings";

type Opt = { id: string; name: string };

function IdSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: Opt[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        items={{
          none: "—",
          ...Object.fromEntries(items.map((i) => [i.id, i.name] as const)),
        }}
        value={value}
        onValueChange={(v) => onChange(v ?? "none")}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OptionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        items={{
          none: "Not set",
          ...Object.fromEntries(options.map((o) => [o, o] as const)),
        }}
        value={value}
        onValueChange={(v) => onChange(v ?? "none")}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not set</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AdvancedPhotoFields({
  cameras,
  lenses,
  cameraId,
  setCameraId,
  lensId,
  setLensId,
  iso,
  setIso,
  aperture,
  setAperture,
  shutterSpeed,
  setShutterSpeed,
  defaultOpen = false,
}: {
  cameras: Opt[];
  lenses: Opt[];
  cameraId: string;
  setCameraId: (v: string) => void;
  lensId: string;
  setLensId: (v: string) => void;
  iso: string;
  setIso: (v: string) => void;
  aperture: string;
  setAperture: (v: string) => void;
  shutterSpeed: string;
  setShutterSpeed: (v: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
        />
        Advanced — camera, lens &amp; settings
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <IdSelect
              label="Camera"
              value={cameraId}
              onChange={setCameraId}
              items={cameras}
            />
            <IdSelect
              label="Lens"
              value={lensId}
              onChange={setLensId}
              items={lenses}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <OptionSelect
              label="ISO"
              value={iso}
              onChange={setIso}
              options={ISO_OPTIONS}
            />
            <OptionSelect
              label="Aperture"
              value={aperture}
              onChange={setAperture}
              options={APERTURE_OPTIONS}
            />
            <OptionSelect
              label="Shutter"
              value={shutterSpeed}
              onChange={setShutterSpeed}
              options={SHUTTER_OPTIONS}
            />
          </div>
        </div>
      )}
    </div>
  );
}
