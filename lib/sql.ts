
function cleanSQL(sql: string): string {
  return sql;
}

function sql(strings: TemplateStringsArray, ...interopStrings: string[]) : string {
  let string: string = '';

  for(let i:number = 0; i < strings.length - 1; i++) {
    // Remove all excess whitespace from the string
    string += strings[i].replaceAll(/\s{1,}/g, ' ');
    string += cleanSQL(interopStrings[i]);
  }

  string+=strings[strings.length - 1].replaceAll(/\s{1,}/g, ' ');
  // Chomp the whitespace from the front and back even further
  return string.replaceAll(/^\s{1,}|\s{1,}$/ig, '');
}

export { sql };