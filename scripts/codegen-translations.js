/* eslint-disable import/no-commonjs */

// This script reads language keys from a file and generates a TypeScript
// declaration file to type `lang.t` calls. The language file to use within
// `src/languages/` defaults to `en_US.json`, and can be specified as an
// argument.
//
// This script can be invoked as
//     yarn codegen-translations
// or
//     yarn codegen-translations _other-language.json
//
// The generated file is placed at `src/languages/types-generated.d.ts`.
// Tags are represented both as period-delimited strings and as arrays of
// tag components in the type declaration.

const fs = require('fs');
const path = require('path');

const languageFilename = process.argv[2] ?? 'en_US.json';
const maxLineLength = 80;

/**
 * Returns the array representation in TypeScript for a tag, to be combined
 * with its string representation in a type. For instance, the tag array
 * `['button', 'send']` becomes the string `  | ['button', 'send']`. If the
 * resulting string is longer than the maximum line length, it is split into
 * multiple lines.
 *
 * @param {string[]} tagAsArray The tag components as an array.
 * @returns {string} The string to use as the tag's array declaration.
 */
function generateArrayRepresentationForTag(tagAsArray) {
  const stringRepresentations = tagAsArray.map(component => `'${component}'`);
  const oneLineAttempt = `  | [${stringRepresentations.join(', ')}]`;

  if (oneLineAttempt.length <= maxLineLength) {
    return oneLineAttempt;
  }

  const multiLineAttempt = `  | [
      ${stringRepresentations.join(',\n      ')}
    ]`;
  return multiLineAttempt;
}

/**
 * Generates both a string and array representation for a given tag and returns
 * its type. For instance, the tag array `['button', 'send']` becomes the
 * string `
 *   | 'button.send'
 *   | ['button', 'send']`.
 *
 * @param {string[]} tagAsArray The tag components as an array.
 * @returns {string} The tag's type, which can be included with other
 * tags to form a full type declaration for any valid tag.
 */
function generateTypeForTag(tagAsArray) {
  return `
  | '${tagAsArray.join('.')}'
${generateArrayRepresentationForTag(tagAsArray)}`;
}

/**
 * Generates the complete contents of a TypeScript declaration file based
 * on an array of valid tags.
 *
 * @param {string[][]} validTagsAsArrays An array of tags, each of which is
 * an array of tag components.
 * @returns {string} The source for a declaration file.
 */
function generateDeclaration(validTagsAsArrays) {
  return `// This file was automatically generated by running \`yarn codegen-translations\`
// using the language file named \`${languageFilename}\`.
//
// To regenerate this file, re-execute the \`yarn codegen-translations\` script.

import { TranslateOptions } from 'i18n-js';

declare module 'i18n-js' {
  function t(scope: ValidScope, options?: TranslateOptions): string;
}

type ValidScope =${validTagsAsArrays.map(generateTypeForTag).join('')};
`;
}

/**
 * Recursively adds all keys of an object and its children to the array
 * `keysArray`. New entries are their own arrays, containing each of their
 * parent keys in descending order and then the key itself. The `prefixArray`
 * defines the parents of keys at this level of recursion.
 *
 * @param {string[][]} keysArray The array of keys to push to.
 * @param {Object} object The object to use for generating keys.
 * @param {string[]} prefixArray The array to use for prefixing this level of
 * keys.
 */
function pushNestedKeysAsArrays(keysArray, object, prefixArray) {
  for (let key in object) {
    const keyRepresentation = prefixArray.concat([key]);
    keysArray.push(keyRepresentation);

    if (typeof object[key] === 'object') {
      pushNestedKeysAsArrays(keysArray, object[key], keyRepresentation);
    }
  }
}

/**
 * Reads from the `languageFilename` file, parses its contents as JSON, and
 * returns the `translation` property.
 *
 * @returns {Object} The parsed language object.
 */
function loadLanguageJson() {
  const languageFilePath = path.resolve(
    __dirname,
    '../src/languages/',
    languageFilename
  );

  const languageContents = fs.readFileSync(languageFilePath, 'utf-8');
  return JSON.parse(languageContents)['translation'];
}

/**
 * Writes generated declaration file contents to
 * `src/languages/types-generated.d.ts`.
 *
 * @param {string} contents The contents of the declaration file.
 */
function writeTypeDeclarationFile(contents) {
  const declarationFilePath = path.resolve(
    __dirname,
    '../src/languages/types-generated.d.ts'
  );

  fs.writeFileSync(declarationFilePath, contents, 'utf-8');
}

/**
 * Runs the generator based on `languageFilename` and writes the output to
 * `src/languages/types-generated.d.ts`.
 */
function run() {
  // Load the language data.
  const languageData = loadLanguageJson();

  // Generate the valid tags as an array of arrays.
  const tagsArray = [];
  pushNestedKeysAsArrays(tagsArray, languageData, []);

  // Convert these tags into the declaration string.
  const declarationString = generateDeclaration(tagsArray);

  // Write the string to a file.
  writeTypeDeclarationFile(declarationString);
}

run();
