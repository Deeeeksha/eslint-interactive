import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import { Remote } from 'comlink';
import { ESLint } from 'eslint';
import { ora } from '../cli/ora.js';
import { promptToInputReuseScript } from '../cli/prompt.js';
import { SerializableCore } from '../core-worker.js';
import { Undo } from '../core.js';
import {
  editFileWithEditor,
  generateExampleFixableMakerScriptFilePath,
  generateFixableMakerScriptFilePath,
} from '../util/filter-script.js';

export async function doMakeFixableAndFixAction(
  core: Remote<SerializableCore>,
  results: ESLint.LintResult[],
  selectedRuleIds: string[],
): Promise<Undo> {
  const exampleScript = await readFile(generateExampleFixableMakerScriptFilePath(), 'utf8');
  const fixableMakerScriptFilePath = generateFixableMakerScriptFilePath(selectedRuleIds);
  const isFixableMakerScriptExist = await access(fixableMakerScriptFilePath)
    .then(() => true)
    .catch(() => false);
  if (isFixableMakerScriptExist) {
    const reuseScript = await promptToInputReuseScript();
    if (!reuseScript) {
      await writeFile(fixableMakerScriptFilePath, exampleScript);
    }
  } else {
    // ディレクトリがない可能性を考慮して作成しておく
    await mkdir(dirname(fixableMakerScriptFilePath), { recursive: true });
    await writeFile(fixableMakerScriptFilePath, exampleScript);
  }
  console.log('Opening editor...');

  const fixableMakerScript = await editFileWithEditor(fixableMakerScriptFilePath);
  const fixingSpinner = ora('Making fixable and fixing...').start();
  const undo = await core.makeFixableAndFix(results, selectedRuleIds, fixableMakerScript);
  fixingSpinner.succeed(chalk.bold('Making fixable and fixing was successful.'));
  return undo;
}
