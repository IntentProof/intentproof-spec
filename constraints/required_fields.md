# Required Fields (v1)

## ExecutionEvent

Always required:

- `id`
- `intent`
- `action`
- `status`
- `inputs`
- `startedAt`
- `completedAt`
- `durationMs`

Conditionally required:

- `output` when `status` is `"ok"`
- `error` when `status` is `"error"`

Optional:

- `correlationId`
- `attributes`

## ExecutionError

Always required:

- `name`
- `message`

Optional:

- `code`
- `stack`
- `cause`

## WrapOptions

All fields optional at the schema level; runtime defaults defined in `schema/wrap_options.v1.schema.json` `default` keywords are authoritative for absent keys during merge.

## IntentProofConfig

No required fields at schema root; `version` SHOULD be set to `1` when the document is used for interchange.
