import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderNavigation,
  groupForPage,
  directLinks,
  navigationGroups,
} from "../src/navigation.js";
test("Navegação mantém destinos únicos e omite administração para quem não tem permissão", () => {
  const links = [...directLinks, ...navigationGroups.flatMap((g) => g.items)];
  assert.equal(links.length, 38);
  assert.equal(new Set(links.map((l) => l[0])).size, 38);
  const plain = renderNavigation(
    "home",
    false,
    () => "",
    (v) => v,
  );
  assert.ok(!plain.includes('data-page="platformAdmin"'));
  assert.ok(plain.includes('data-page="settings"'));
  assert.ok(plain.includes('data-page="backup"'));
  const admin = renderNavigation(
    "platformAdmin",
    true,
    () => "",
    (v) => v,
  );
  assert.ok(admin.includes('data-page="platformAdmin"'));
  assert.equal(groupForPage("platformAdmin"), "settings");
  assert.equal(groupForPage("home"), null);
  assert.equal(groupForPage("collections"), "finance");
});
