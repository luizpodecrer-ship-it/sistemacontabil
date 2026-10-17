import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultOffice,
  normalizeBrand,
  validateDimensions,
  ink,
  slugify,
} from "../src/features/branding/model";
test("Identidade aceita limites dos formatos e rejeita imagens maiores", () => {
  assert.doesNotThrow(() => validateDimensions(500, 500, "square"));
  assert.doesNotThrow(() => validateDimensions(500, 250, "horizontal"));
  assert.throws(() => validateDimensions(501, 250, "horizontal"));
  assert.throws(() => validateDimensions(500, 251, "horizontal"));
  assert.throws(() => validateDimensions(0, 10, "square"));
});
test("Cor branca tem contraste e identidade salva não aceita SVG ou cor injetada", () => {
  assert.equal(ink("#ffffff"), "#171717");
  assert.equal(ink("#171717"), "#ffffff");
  assert.equal(slugify("Escritório São Luís"), "escritorio-sao-luis");
  const value = normalizeBrand(
    {
      logo: "data:image/svg+xml,<svg/>",
      color: "red;display:none",
      name: "Teste",
    },
    defaultOffice,
  );
  assert.equal(value.logo, "");
  assert.equal(value.color, defaultOffice.color);
});
