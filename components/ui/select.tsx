import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
type Option = {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
  searchText?: string;
};
type Props = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  | "onChange"
  | "onBlur"
  | "multiple"
  | "size"
  | "value"
  | "defaultValue"
  | "onKeyDown"
> & {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: {
    target: { value: string };
    currentTarget: { value: string };
  }) => void;
  onBlur?: () => void;
  searchable?: boolean;
};
const text = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? text(child.props.children)
          : "",
    )
    .join("");
function collect(
  children: ReactNode,
  group?: string,
  disabled = false,
): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        "data-search"?: string;
        value?: string | number;
        label?: string;
        disabled?: boolean;
        children?: ReactNode;
      }>(child)
    )
      return [];
    if (child.type === "option")
      return [
        {
          value: String(child.props.value ?? text(child.props.children)),
          label: child.props.label ?? text(child.props.children),
          disabled: disabled || !!child.props.disabled,
          group,
          searchText: child.props["data-search"],
        },
      ];
    return collect(
      child.props.children,
      child.type === "optgroup" ? child.props.label : group,
      disabled || !!child.props.disabled,
    );
  });
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  onBlur,
  searchable,
  id,
  name,
  className = "",
  disabled,
  required,
  form,
  autoFocus,
  ...aria
}: Props) {
  const generated = useId(),
    uid = id || `select-${generated}`,
    listId = `${uid}-options`;
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null);
  const [internal, setInternal] = useState(String(defaultValue ?? "")),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(-1),
    [position, setPosition] = useState({
      left: 0,
      top: 0,
      width: 0,
      height: 320,
    });
  const options = collect(children),
    selected = String(value ?? internal),
    choice = options.find((o) => o.value === selected);
  const hasSearch =
    searchable ??
    (options.length >= 10 ||
      /empresa|cargo|cbo|sindicato|conta|colaborador/i.test(
        String(aria["aria-label"] || name || id || ""),
      ));
  const filtered = options.filter((o) =>
      normalize(`${o.label} ${o.value} ${o.searchText || ""}`).includes(
        normalize(query),
      ),
    ),
    enabled = filtered
      .map((o, i) => (o.disabled ? -1 : i))
      .filter((i) => i >= 0);
  const label = String(aria["aria-label"] || name || "opções");
  function close(restore = false) {
    setOpen(false);
    setQuery("");
    onBlur?.();
    if (restore) trigger.current?.focus();
  }
  function show() {
    if (disabled || trigger.current?.matches(":disabled")) return;
    setQuery("");
    const index = options.findIndex((o) => o.value === selected && !o.disabled);
    setActive(index >= 0 ? index : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }
  function choose(option: Option) {
    if (option.disabled) return;
    setInternal(option.value);
    onChange?.({
      target: { value: option.value },
      currentTarget: { value: option.value },
    });
    close(true);
  }
  function keys(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === "Tab" && open) {
      close(true);
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const current = enabled.indexOf(active);
      setActive(
        event.key === "Home"
          ? enabled[0]
          : event.key === "End"
            ? (enabled.at(-1) ?? -1)
            : (enabled[
                (current +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  enabled.length) %
                  enabled.length
              ] ?? -1),
      );
    }
    if (
      event.key === "Enter" ||
      (event.key === " " && event.target !== search.current)
    ) {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    }
    if (
      !hasSearch &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key !== " "
    ) {
      event.preventDefault();
      const index = filtered.findIndex(
        (o, i) =>
          i > active &&
          !o.disabled &&
          normalize(o.label).startsWith(normalize(event.key)),
      );
      setActive(
        index >= 0
          ? index
          : filtered.findIndex(
              (o) =>
                !o.disabled &&
                normalize(o.label).startsWith(normalize(event.key)),
            ),
      );
    }
  }
  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const bottom =
          (viewport?.height ?? innerHeight) + (viewport?.offsetTop ?? 0),
        topBound = viewport?.offsetTop ?? 0;
      const below = bottom - rect.bottom - 8,
        above = rect.top - topBound - 8;
      const height = Math.max(80, Math.min(360, Math.max(below, above) - 8));
      const contentHeight = Math.min(
        height,
        popup.current?.getBoundingClientRect().height ||
          filtered.length * 44 + 10 + (hasSearch ? 58 : 0),
      );
      const leftBound = viewport?.offsetLeft ?? 0;
      const viewportWidth = viewport?.width ?? innerWidth;
      const width = Math.min(Math.max(rect.width, 200), viewportWidth - 16);
      const preferredTop =
        below >= Math.min(260, above)
          ? rect.bottom + 5
          : rect.top - contentHeight - 5;
      setPosition({
        left: Math.max(
          leftBound + 8,
          Math.min(rect.left, leftBound + viewportWidth - width - 8),
        ),
        top: Math.max(
          topBound + 8,
          Math.min(preferredTop, bottom - contentHeight - 8),
        ),
        width,
        height,
      });
    }
    place();
    const frame = requestAnimationFrame(() => {
      place();
      if (hasSearch) search.current?.focus();
    });
    const outside = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close();
    };
    const focus = (event: FocusEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        event.target !== trigger.current
      )
        close();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focus);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open, hasSearch, filtered.length]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    const element = trigger.current?.form;
    const reset = () => {
      setInternal(String(defaultValue ?? ""));
      setOpen(false);
    };
    element?.addEventListener("reset", reset);
    return () => element?.removeEventListener("reset", reset);
  }, [defaultValue]);
  const target = trigger.current?.closest("dialog") || document.body;
  return (
    <>
      <button
        {...(aria as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        ref={trigger}
        id={uid}
        name={undefined}
        form={form}
        type="button"
        role="combobox"
        value={selected}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-required={required || aria["aria-required"]}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-${active}` : undefined
        }
        className={`system-select form-control ${className}`}
        data-placeholder={!selected ? "" : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={keys}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
      >
        <span className="min-w-0 flex-1 text-left font-normal leading-5 [overflow-wrap:anywhere]">
          {choice?.label || "Selecione"}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {name && (
        <input
          type="hidden"
          name={name}
          value={selected}
          disabled={disabled}
          form={form}
        />
      )}
      {open &&
        createPortal(
          <div
            ref={popup}
            className="system-select-popup"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.height,
            }}
            onKeyDown={keys}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {hasSearch && (
              <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 px-3 py-2">
                <Search size={15} className="shrink-0 text-neutral-400" />
                <input
                  ref={search}
                  type="text"
                  role="combobox"
                  aria-label={`Buscar ${label}`}
                  aria-controls={listId}
                  aria-expanded="true"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    active >= 0 ? `${listId}-${active}` : undefined
                  }
                  placeholder="Buscar por nome ou código…"
                  className="min-h-9 min-w-0 w-full bg-transparent text-sm outline-none"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(
                      options
                        .filter((o) =>
                          normalize(
                            `${o.label} ${o.value} ${o.searchText || ""}`,
                          ).includes(normalize(e.target.value)),
                        )
                        .findIndex((o) => !o.disabled),
                    );
                  }}
                />
              </div>
            )}
            <div
              id={listId}
              role="listbox"
              aria-label={label}
              className="min-h-0 overflow-y-auto overscroll-contain p-1"
            >
              {filtered.map((option, index) => (
                <div
                  key={`${option.value}-${index}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.value === selected}
                  aria-disabled={option.disabled || undefined}
                  data-value={option.value}
                  className={`system-select-option ${index === active ? "is-active" : ""}`}
                  onPointerMove={() => {
                    if (!option.disabled) setActive(index);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                >
                  {option.group &&
                    filtered[index - 1]?.group !== option.group && (
                      <span className="sr-only">{option.group}: </span>
                    )}
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    {option.label}
                  </span>
                  {option.value === selected && (
                    <Check size={16} className="shrink-0" aria-hidden="true" />
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <p role="status" className="p-3 text-sm text-neutral-500">
                  Nenhuma opção encontrada.
                </p>
              )}
            </div>
          </div>,
          target,
        )}
    </>
  );
}
