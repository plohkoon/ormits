// TODO: this
function cleanSQL(sql: string): string {
  return sql;
}

function cleanWhiteSpace(str: string): string {
  return str.replaceAll(/\s{1,}/g, ' ').replaceAll(/^\s{1,}|\s{1,}$/ig, '')
}

function sql(strings: TemplateStringsArray, ...interopStrings: string[]) : string {
  let string: string[] = [];

  for(let i:number = 0; i < strings.length - 1; i++) {
    let newStr: string = cleanWhiteSpace(strings[i]);
    if (newStr.length > 0)
      string.push(newStr);
    newStr = cleanWhiteSpace(interopStrings[i]);
    if (newStr.length > 0)
      string.push(cleanSQL(newStr));
  }

  let newStr: string = strings[strings.length - 1]
  if (newStr.length > 0)
    string.push(cleanWhiteSpace(newStr));
  // Chomp the whitespace from the front and back even further
  return string.join(' ');
}

export { sql };