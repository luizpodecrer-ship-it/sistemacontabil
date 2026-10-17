import { useRef, type InputHTMLAttributes } from "react";
import { masks, type Mask } from "@/lib/formats";

export interface FieldSpec {
  key: string;
  label: string;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  mask?: Mask;
  options?: string[];
  choices?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  wide?: boolean;
  autoComplete?: string;
  maxLength?: number;
}
interface Props {
  spec: FieldSpec;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  layoutClassName?: string;
}
export function FormField({
  spec,
  value,
  error,
  onChange,
  onBlur,
  layoutClassName,
}: Props) {
  const id = `field-${spec.key}`;
  const ref = useRef<HTMLInputElement>(null);
  const common = {
    id,
    name: spec.key,
    "aria-label": spec.label,
    "aria-invalid": Boolean(error),
    "aria-required": spec.required || undefined,
    "aria-describedby":
      [spec.hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
        .filter(Boolean)
        .join(" ") || undefined,
    className: "form-control",
    value,
    onBlur,
  };
  return (
    <div className={layoutClassName ?? (spec.wide ? "md:col-span-2" : "")}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-neutral-700"
      >
        {spec.label}
        {spec.required && (
          <span className="ml-1 text-neutral-400" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {spec.options || spec.choices ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecione</option>
          {(
            spec.choices ||
            spec.options?.map((o) => ({ value: o, label: o })) ||
            []
          ).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : spec.type === "textarea" ? (
        <textarea
          {...common}
          rows={3}
          maxLength={spec.maxLength ?? 2000}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...common}
          ref={ref}
          type={spec.type || "text"}
          placeholder={spec.placeholder}
          autoComplete={spec.autoComplete || "off"}
          maxLength={spec.maxLength ?? (spec.mask ? 30 : 160)}
          inputMode={
            spec.mask && spec.mask !== "cnpj" && spec.mask !== "crc"
              ? "numeric"
              : spec.type === "email"
                ? "email"
                : undefined
          }
          onKeyDown={(e) => {
            if (
              !spec.mask ||
              spec.mask === "money" ||
              !["Backspace", "Delete"].includes(e.key)
            )
              return;
            const node = e.currentTarget;
            const start = node.selectionStart,
              end = node.selectionEnd;
            if (start === null || start !== end) return;
            const adjacent = e.key === "Backspace" ? start - 1 : start;
            if (
              adjacent < 0 ||
              adjacent >= value.length ||
              /[a-z0-9]/i.test(value[adjacent])
            )
              return;
            e.preventDefault();
            let remove = adjacent;
            const step = e.key === "Backspace" ? -1 : 1;
            while (
              remove >= 0 &&
              remove < value.length &&
              !/[a-z0-9]/i.test(value[remove])
            )
              remove += step;
            if (remove < 0 || remove >= value.length) return;
            const raw = value.slice(0, remove) + value.slice(remove + 1);
            const formatted = masks[spec.mask](raw);
            const count = value
              .slice(0, e.key === "Backspace" ? remove : start)
              .replace(/[^a-z0-9]/gi, "").length;
            onChange(formatted);
            requestAnimationFrame(() => {
              let pos = 0,
                seen = 0;
              while (pos < formatted.length && seen < count) {
                if (/[a-z0-9]/i.test(formatted[pos])) seen++;
                pos++;
              }
              ref.current?.setSelectionRange(pos, pos);
            });
          }}
          onChange={(e) => {
            const raw = e.target.value;
            const formatted = spec.mask ? masks[spec.mask](raw) : raw;
            // Preserve cursor position when editing in the middle of a masked value.
            const cursor = e.target.selectionStart;
            const count =
              cursor === null
                ? null
                : raw.slice(0, cursor).replace(/[^a-z0-9]/gi, "").length;
            onChange(formatted);
            if (spec.mask && spec.mask !== "money" && count !== null)
              requestAnimationFrame(() => {
                const node = ref.current;
                if (!node || document.activeElement !== node) return;
                let pos = 0,
                  seen = 0;
                while (pos < formatted.length && seen < count) {
                  if (/[a-z0-9]/i.test(formatted[pos])) seen++;
                  pos++;
                }
                node.setSelectionRange(pos, pos);
              });
          }}
        />
      )}
      {spec.hint && (
        <p
          id={`${id}-hint`}
          className="mt-1 text-[11px] leading-relaxed text-neutral-400"
        >
          {spec.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
