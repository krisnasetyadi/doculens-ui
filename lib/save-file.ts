/** Hands a downloaded file to the browser to save under `fileName`. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Not in the same tick: some browsers (Safari) start the download after click() returns, and a
  // URL already revoked by then gives a failed or empty file.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
