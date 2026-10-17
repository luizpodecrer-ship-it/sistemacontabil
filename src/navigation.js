export const directLinks = [
  ["home", "home", "Dashboard"],
  ["jobs", "briefcase", "Cargos"],
  ["company", "company", "Empresas"],
  ["unions", "landmark", "Sindicatos"],
];
export const navigationGroups = [
  {
    id: "operation",
    label: "Operação",
    icon: "tasks",
    items: [
      ["tasks", "tasks", "Processos e tarefas"],
      ["obligations", "tasks", "Agenda de obrigações"],
      ["docs", "docs", "Documentos"],
      ["messaging", "docs", "Atendimento"],
    ],
  },
  {
    id: "accounting",
    label: "Contábil e fiscal",
    icon: "landmark",
    items: [
      ["accounting", "chart", "Contabilidade"],
      ["accounts", "docs", "Plano de contas"],
      ["closing", "tasks", "Revisão e fechamento"],
      ["fiscal", "docs", "Escrita fiscal"],
      ["lalur", "chart", "IRPJ e CSLL"],
      ["reform", "chart", "Reforma tributária"],
      ["assets", "company", "Patrimônio"],
    ],
  },
  {
    id: "people",
    label: "Pessoal e folha",
    icon: "company",
    items: [
      ["employees", "company", "Pessoal e vínculos"],
      ["payrollEvents", "chart", "Folha de pagamento"],
      ["benefits", "company", "Benefícios"],
      ["conventions", "docs", "Convenções coletivas"],
    ],
  },
  {
    id: "finance",
    label: "Financeiro",
    icon: "chart",
    items: [
      ["clientFinance", "chart", "Financeiro dos clientes"],
      ["officeFinance", "chart", "Financeiro do escritório"],
      ["fees", "docs", "Contratos e honorários"],
      ["collections", "chart", "Cobranças"],
      ["banking", "chart", "Conciliação bancária"],
    ],
  },
  {
    id: "management",
    label: "Gestão do escritório",
    icon: "briefcase",
    items: [
      ["chart", "chart", "Indicadores"],
      ["team", "company", "Equipe e capacidade"],
      ["audit", "tasks", "Histórico de operações"],
    ],
  },
  {
    id: "integrations",
    label: "Integrações e automação",
    icon: "plug",
    items: [
      ["plug", "plug", "Integrações"],
      ["automation", "settings", "Automação"],
      ["invoiceSearch", "search", "Importação NF-e"],
      ["integrationRequests", "plug", "Solicitações de integração"],
    ],
  },
  {
    id: "portals",
    label: "Portais e conteúdo",
    icon: "docs",
    items: [
      ["clientPortal", "company", "Portal do cliente"],
      ["employeePortal", "company", "Portal do empregado"],
      ["content", "docs", "Conteúdo tributário"],
      ["academy", "docs", "Academy"],
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    icon: "settings",
    items: [
      ["settings", "settings", "Personalização do escritório"],
      ["platformAdmin", "settings", "Identidade do sistema"],
      ["backup", "docs", "Backup e recuperação"],
    ],
  },
];
export const groupForPage = (page) =>
  navigationGroups.find((group) => group.items.some((item) => item[0] === page))
    ?.id || null;
export function renderNavigation(page, admin, icon, esc) {
  const link = ([id, glyph, label]) =>
    `<button type="button" data-page="${id}" title="${esc(label)}" aria-label="${esc(label)}" ${page === id ? 'aria-current="page"' : ""} class="nav-link ${page === id ? "active" : ""}">${icon(glyph)}<span data-label>${esc(label)}</span></button>`;
  const activeGroup = groupForPage(page);
  return `<div class="direct-navigation" aria-label="Acesso direto">${directLinks.map(link).join("")}</div><p data-label class="nav-section-label">Áreas do escritório</p>${navigationGroups
    .map((group) => {
      const items = group.items.filter(
        (item) => admin || item[0] !== "platformAdmin",
      );
      const open = activeGroup === group.id;
      return `<section data-nav-group="${group.id}" class="nav-group"><button type="button" data-group="${group.id}" data-open="${open}" aria-controls="nav-${group.id}" aria-expanded="${open}" aria-label="${group.label}" title="${group.label}" class="nav-group-trigger ${open ? "contains-active current-group" : ""}">${icon(group.icon)}<span data-label>${group.label}</span><span data-group-chevron aria-hidden="true">${icon("chevron", "w-3.5 h-3.5")}</span></button><div id="nav-${group.id}" class="nav-group-items" ${open ? "" : "hidden"}>${items.map(link).join("")}</div></section>`;
    })
    .join("")}`;
}
export function syncNavigation() {
  const rail = document.querySelector(".rail");
  if (!rail) return;
  const iconMode =
    rail.classList.contains("collapsed") &&
    !matchMedia("(max-width:767px)").matches;
  rail.querySelectorAll("[data-group]").forEach((button) => {
    const expanded = button.dataset.open === "true" && !iconMode;
    button.setAttribute("aria-expanded", String(expanded));
    document.getElementById(`nav-${button.dataset.group}`).hidden = !expanded;
  });
}
let teardown;
export function clearNavigation() {
  teardown?.();
  teardown = undefined;
}
export function bindNavigation({ go, toggleCollapsed, collapsed }) {
  clearNavigation();
  const rail = document.querySelector(".rail"),
    main = document.querySelector("#main-shell"),
    backdrop = document.querySelector("#nav-backdrop"),
    trigger = document.querySelector("#mobile");
  const mobile = matchMedia("(max-width:767px)");
  let lastFocus;
  const focusable = () =>
    [...rail.querySelectorAll("button:not(:disabled),a[href]")].filter(
      (el) => el.getClientRects().length,
    );
  function closeMobile(restore = true) {
    rail.classList.remove("mobile-open");
    rail.classList.add("mobile-hidden");
    backdrop.hidden = true;
    main.inert = false;
    document.body.classList.remove("nav-drawer-open");
    trigger.setAttribute("aria-expanded", "false");
    rail.removeAttribute("role");
    rail.removeAttribute("aria-modal");
    if (restore && mobile.matches) lastFocus?.focus();
  }
  function openMobile() {
    lastFocus = document.activeElement;
    rail.classList.remove("mobile-hidden");
    rail.classList.add("mobile-open");
    backdrop.hidden = false;
    main.inert = true;
    document.body.classList.add("nav-drawer-open");
    trigger.setAttribute("aria-expanded", "true");
    rail.setAttribute("role", "dialog");
    rail.setAttribute("aria-modal", "true");
    rail.querySelector("#close-mobile").focus();
  }
  function setGroup(id, focus = false) {
    if (collapsed() && !mobile.matches) toggleCollapsed(false);
    rail.querySelectorAll("[data-group]").forEach((button) => {
      const open = button.dataset.group === id;
      button.dataset.open = String(open);
      button.setAttribute("aria-expanded", String(open));
      button.classList.toggle("contains-active", open);
      document.getElementById(`nav-${button.dataset.group}`).hidden = !open;
    });
    if (focus)
      rail.querySelector(`[data-nav-group="${id}"] [data-page]`)?.focus();
  }
  rail.querySelectorAll("[data-group]").forEach(
    (button) =>
      (button.onclick = () => {
        const opening =
          button.getAttribute("aria-expanded") !== "true" ||
          (collapsed() && !mobile.matches);
        setGroup(
          opening ? button.dataset.group : null,
          opening && collapsed() && !mobile.matches,
        );
      }),
  );
  rail.querySelectorAll("[data-page]").forEach(
    (button) =>
      (button.onclick = () => {
        go(button.dataset.page);
      }),
  );
  trigger.onclick = () =>
    rail.classList.contains("mobile-open") ? closeMobile() : openMobile();
  rail.querySelector("#close-mobile").onclick = () => closeMobile();
  backdrop.onclick = () => closeMobile();
  const keydown = (event) => {
    if (mobile.matches && rail.classList.contains("mobile-open")) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobile();
        return;
      }
      if (event.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "b" &&
      !event.defaultPrevented &&
      !event.target.closest('input,textarea,select,[contenteditable="true"]') &&
      !document.querySelector("dialog[open]")
    ) {
      event.preventDefault();
      if (mobile.matches) {
        rail.classList.contains("mobile-open") ? closeMobile() : openMobile();
      } else toggleCollapsed();
    }
  };
  const resize = () => {
    closeMobile(false);
    syncNavigation();
  };
  document.addEventListener("keydown", keydown);
  mobile.addEventListener("change", resize);
  teardown = () => {
    document.removeEventListener("keydown", keydown);
    mobile.removeEventListener("change", resize);
    main.inert = false;
    document.body.classList.remove("nav-drawer-open");
  };
  syncNavigation();
  return { setGroup, closeMobile };
}
