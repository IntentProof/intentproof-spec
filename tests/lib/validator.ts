import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsPlugin from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
import { loadSpecManifest } from "./spec-manifest.js";
import { REPO_ROOT } from "./paths.js";

/** ajv-formats default export is a callable plugin; its package typings disagree with verbatimModuleSyntax here. */
const applyFormats = addFormatsPlugin as unknown as (ajv: Ajv2020) => void;

function loadJson(relative: string): object {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relative), "utf8")) as object;
}

let executionValidator: ValidateFunction | undefined;
let wrapValidator: ValidateFunction | undefined;
let configValidator: ValidateFunction | undefined;

function createAjv(): Ajv2020 {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
  });
  applyFormats(ajv);
  return ajv;
}

export function getExecutionEventValidator(): ValidateFunction {
  if (!executionValidator) {
    const m = loadSpecManifest();
    const ajv = createAjv();
    executionValidator = ajv.compile(loadJson(m.schemas.execution_event));
  }
  return executionValidator;
}

export function getWrapOptionsValidator(): ValidateFunction {
  if (!wrapValidator) {
    const m = loadSpecManifest();
    const ajv = createAjv();
    wrapValidator = ajv.compile(loadJson(m.schemas.wrap_options));
  }
  return wrapValidator;
}

export function getIntentProofConfigValidator(): ValidateFunction {
  if (!configValidator) {
    const m = loadSpecManifest();
    const ajv = createAjv();
    const wrap = loadJson(m.schemas.wrap_options);
    const cfg = loadJson(m.schemas.intentproof_config);
    ajv.addSchema(wrap);
    configValidator = ajv.compile(cfg);
  }
  return configValidator;
}

export function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return [];
  return errors.map((e) => `${e.instancePath || "/"} ${e.message}`.trim());
}
