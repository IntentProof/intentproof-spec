import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsPlugin from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths.js";

/** ajv-formats default export is a callable plugin; its package typings disagree with verbatimModuleSyntax here. */
const applyFormats = addFormatsPlugin as unknown as (ajv: Ajv2020) => void;

function loadJson(file: string): object {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), "utf8")) as object;
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
    const ajv = createAjv();
    executionValidator = ajv.compile(loadJson("schema/execution_event.v1.schema.json"));
  }
  return executionValidator;
}

export function getWrapOptionsValidator(): ValidateFunction {
  if (!wrapValidator) {
    const ajv = createAjv();
    wrapValidator = ajv.compile(loadJson("schema/wrap_options.v1.schema.json"));
  }
  return wrapValidator;
}

export function getIntentProofConfigValidator(): ValidateFunction {
  if (!configValidator) {
    const ajv = createAjv();
    const wrap = loadJson("schema/wrap_options.v1.schema.json");
    const cfg = loadJson("schema/intentproof_config.v1.schema.json");
    ajv.addSchema(wrap);
    configValidator = ajv.compile(cfg);
  }
  return configValidator;
}

export function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return [];
  return errors.map((e) => `${e.instancePath || "/"} ${e.message}`.trim());
}
