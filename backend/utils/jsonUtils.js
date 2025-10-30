/**
 * Attempts to clean and parse a JSON string that may have minor syntax errors,
 * like trailing commas, which are common in LLM outputs.
 * @param {string} jsonString The raw JSON string to parse.
 * @returns {object} The parsed JavaScript object.
 * @throws {SyntaxError} If the string is still not valid JSON after cleaning.
 */
function cleanAndParseJson(jsonString) {
  if (typeof jsonString !== 'string') {
    throw new Error('Input must be a string.');
  }

  // 1. Remove comments (though not standard in JSON, LLMs might add them)
  // This regex removes // and /* ... */ comments
  const withoutComments = jsonString.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  // 2. Remove trailing commas from objects and arrays
  // e.g., { "a": 1, } -> { "a": 1 }
  // e.g., [ 1, 2, ] -> [ 1, 2 ]
  const withoutTrailingCommas = withoutComments.replace(/,\s*([}\]])/g, '$1');

  // 3. Trim whitespace
  const trimmed = withoutTrailingCommas.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.error("JSON parsing failed even after cleaning.", { original: jsonString, cleaned: trimmed });
    throw error; // Re-throw the original error to be caught by the caller
  }
}

module.exports = { cleanAndParseJson };
