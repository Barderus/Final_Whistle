function parseCsvLine(line) {
  const values = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
    } else {
      currentValue += character;
    }
  }

  values.push(currentValue.trim());
  return values;
}

export function parseMatchesCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const match = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );

    return {
      ...match,
      match_number: Number(match.match_number),
    };
  });
}
