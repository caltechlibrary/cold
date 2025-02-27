import { join as joinPath } from "./path.js";

function handleError(i, input, expected, got) {
  console.log(`%c(${i+1} -> "${input}"), %cexpected "${expected}", got "${got}"`, "color: yellow", "color: red");
  return true;
}

function testJoinPath() {
  const testCases = [
    { input: ["foo", "bar", "baz"], expected: "foo/bar/baz" },
    { input: ["foo", "bar", "../baz"], expected: "foo/baz" },
    { input: ["foo", "bar", "../.."], expected: "" },
    { input: ["foo", "./bar", "../baz"], expected: "foo/baz" },
    { input: ["foo", "bar", "../baz"], expected: "foo/baz" },
    { input: ["foo", "bar", "../bar", "../baz"], expected: "foo/baz" },
    { input: ["foo", "bar", "../bar", "../.."], expected: "" },
    { input: ["foo", "bar", "../bar", "..", "baz"], expected: "foo/baz" },
    { input: ["foo", "bar", "../bar", "..", "./baz"], expected: "foo/baz" },
    { input: ["foo", "bar", "../bar", "..", "./baz", ".."], expected: "foo" },
    { input: ["..", "foo", "bar"], expected: "../foo/bar" },
    { input: ["foo", "..", "bar"], expected: "bar" },
    { input: ["foo", "..", "..", "bar"], expected: "../bar" },
    { input: ["foo/bar", "../baz"], expected: "foo/baz" },
    { input: ["foo/bar", "../../baz"], expected: "baz" },
    { input: ["foo/bar", "../../../baz"], expected: "../baz" },
  ];
  let hasErrors = false;
  let i = 0;
  for (const { input, expected } of testCases) {
    const got = joinPath(...input);
    (got === expected) ? "" : hasErrors = handleError(i, input, expected, got);
    i++;
  }
  if (hasErrors) {
    console.error('Tests failed!')
  } else {
    console.log('Success!');
  }
}

testJoinPath();
