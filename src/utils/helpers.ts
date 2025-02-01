export const jsLiteralToJSON = (literal: string): string => {
  return literal.replace(/'/g, '"').replace(/(\b\w+\b)\s*:/g, '"$1":');
};
