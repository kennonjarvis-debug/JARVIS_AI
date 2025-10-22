/*
  Build a Jarvis .shortcut from a high-level JSON spec using shortcuts-js.
  Usage:
    node scripts/build-jarvis-shortcut.js <input_json> <output_shortcut>
*/
const fs = require('fs');
const path = require('path');

const {
  actionOutput,
  buildShortcut,
  withVariables,
} = require('@joshfarrant/shortcuts-js');

const {
  ask,
  URL: URLAction,
  getContentsOfURL,
  getDictionaryFromInput,
  getDictionaryValue,
  speakText,
} = require('@joshfarrant/shortcuts-js/actions');

const inputPath = process.argv[2] || '/Users/benkennon/ai-dawg-v0.1/docs/integrations/Ask-Jarvis-Prod.shortcut.json';
const outputPath = process.argv[3] || path.join(__dirname, '..', 'public', 'Jarvis.shortcut');

function main() {
  let spec = null;
  try { spec = JSON.parse(fs.readFileSync(inputPath, 'utf8')); } catch (_) {}

  // Extract from simple spec
  const prompt = (spec?.actions?.find(a => a.type === 'DictateText')?.prompt)
    || 'What would you like to ask Jarvis?';
  const apiUrl = process.env.NEXT_PUBLIC_JARVIS_API_URL
    || (spec?.actions?.find(a => a.type === 'PostContentsOfURL')?.url)
    || 'https://jarvis-ai-backend.onrender.com/api/chat';
  const headers = (spec?.actions?.find(a => a.type === 'PostContentsOfURL')?.headers) || { 'Content-Type': 'application/json' };
  const bodyKey = 'text';
  const responseKey = (spec?.actions?.find(a => a.type === 'GetDictionaryValue')?.key) || 'response';

  // Outputs
  const queryVar = actionOutput();
  const respRawVar = actionOutput();
  const respDictVar = actionOutput();

  // Build actions sequence equivalent to the provided JSON
  const actions = [
    ask({ question: prompt, inputType: 'Text' }, queryVar),
    URLAction({ url: apiUrl }),
    getContentsOfURL({
      headers,
      method: 'POST',
      requestBodyType: 'JSON',
      requestBody: { [bodyKey]: withVariables`${queryVar}` },
    }, respRawVar),
    // Parse JSON response into a dictionary
    getDictionaryFromInput({}, respDictVar),
    // Extract nested response: data -> response
    getDictionaryValue({ key: 'data', get: 'Value' }),
    getDictionaryValue({ key: 'response', get: 'Value' }),
    // Speak the extracted text (consumes previous output as input)
    speakText({ voice: 'Default', rate: 0.5, waitUntilFinished: true }),
  ];

  const shortcutBuffer = buildShortcut(actions);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, shortcutBuffer);
  console.log(`Wrote shortcut to ${outputPath}`);
}

main();
