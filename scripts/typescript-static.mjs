import ts from 'typescript';

export function parseTypescript(source, fileName = 'source.ts') {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

const unwrap = (node) => {
  let value = node;
  while (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) value = value.expression;
  return value;
};

const propertyName = (node) => {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return undefined;
};

export const readStringLiteral = (node) => {
  const value = node && unwrap(node);
  return value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) ? value.text : undefined;
};

export const readBooleanLiteral = (node) => {
  const value = node && unwrap(node);
  return value?.kind === ts.SyntaxKind.TrueKeyword ? true : value?.kind === ts.SyntaxKind.FalseKeyword ? false : undefined;
};

export function readObjectProperty(object, name) {
  const value = object && unwrap(object);
  if (!value || !ts.isObjectLiteralExpression(value)) return undefined;
  const property = value.properties.find((candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate.name) === name);
  return property?.initializer;
}

export function findCallObjects(sourceFile, callName) {
  const values = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === callName) {
      const value = unwrap(node.arguments[0]);
      if (value && ts.isObjectLiteralExpression(value)) values.push(value);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
}

export function collectStringArrayProperties(root, name) {
  const values = [];
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === name) {
      const array = unwrap(node.initializer);
      if (!ts.isArrayLiteralExpression(array)) throw new Error(`${name} must be a static string array`);
      for (const element of array.elements) {
        const value = readStringLiteral(element);
        if (value === undefined) throw new Error(`${name} must be a static string array`);
        values.push(value);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return values;
}

export function findPropertyCall(sourceFile, name) {
  const calls = [];
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === name) {
      const value = unwrap(node.initializer);
      if (ts.isCallExpression(value) && ts.isIdentifier(value.expression)) calls.push(value.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}

export function collectStringProperties(sourceFile, name, prefix) {
  const values = [];
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === name) {
      const value = readStringLiteral(node.initializer);
      if (value?.startsWith(prefix)) values.push(value);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
}

export function collectModuleSpecifiers(sourceFile) {
  const values = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const value = readStringLiteral(node.moduleSpecifier);
      if (value !== undefined) values.push(value);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const value = readStringLiteral(node.arguments[0]);
      if (value !== undefined) values.push(value);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
}

export function collectStaticRuntimeModuleSpecifiers(sourceFile) {
  const values = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const clause = node.importClause;
      const namedImports = clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
        : undefined;
      const typeOnly = clause?.isTypeOnly
        || (namedImports?.length && !clause?.name && namedImports.every((element) => element.isTypeOnly));
      if (!typeOnly) {
        const value = readStringLiteral(node.moduleSpecifier);
        if (value !== undefined) values.push(value);
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const namedExports = node.exportClause && ts.isNamedExports(node.exportClause)
        ? node.exportClause.elements
        : undefined;
      const typeOnly = node.isTypeOnly
        || (namedExports?.length && namedExports.every((element) => element.isTypeOnly));
      if (!typeOnly) {
        const value = readStringLiteral(node.moduleSpecifier);
        if (value !== undefined) values.push(value);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
}
