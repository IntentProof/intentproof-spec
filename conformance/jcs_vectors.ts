// RFC 8785 (JCS) conformance vectors.
// Each vector: { input: any, expected: string }
export const vectors = [
  {
    input: { "b": 2, "a": 1 },
    expected: '{"a":1,"b":2}'
  },
  {
    input: { "b": "2", "a": "1" },
    expected: '{"a":"1","b":"2"}'
  },
  {
    input: { "c": 0, "b": [], "a": {} },
    expected: '{"a":{},"b":[],"c":0}'
  },
  {
    input: { "11": "eleven", "10": "ten", "1": "one" },
    expected: '{"1":"one","10":"ten","11":"eleven"}'
  },
  {
    input: { "b": 1.2, "a": 1.0 },
    expected: '{"a":1,"b":1.2}'
  },
  {
    input: { "b": true, "a": false },
    expected: '{"a":false,"b":true}'
  },
  {
    input: { "b": null, "a": null },
    expected: '{"a":null,"b":null}'
  },
  {
    input: { "b": [3, 2, 1], "a": [1, 2, 3] },
    expected: '{"a":[1,2,3],"b":[3,2,1]}'
  },
  {
    input: { "unicode": "é", "ascii": "e" },
    expected: '{"ascii":"e","unicode":"é"}'
  },
  {
    input: { "slash": "a/b", "backslash": "a\\b" },
    expected: '{"backslash":"a\\\\b","slash":"a/b"}'
  }
];
