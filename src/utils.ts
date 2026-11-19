export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Display copy only; does not alter counts or records. */
export function plural(
  count: number,
  singular: string,
  pluralForm = singular + "s",
) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
