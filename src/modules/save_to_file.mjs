/**
 * Converts a Blob to a data URL.
 * @param {Blob} blob The blob to convert.
 * @returns {Promise<string>} A promise that resolves with the data URL.
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save text data as a file. This version is compatible with service workers.
 * @param {string} text
 * @param {string} name
 * @param {Format} format
 * @param {boolean} saveAs
 */
export default async function saveToFile(
  text,
  name,
  { ext, mimeType },
  saveAs = false,
) {
  const blob = new Blob([text], { type: mimeType });
  const filename = name + ext;

  // Service workers do not have URL.createObjectURL, so we convert the blob to a data URL.
  const url = await blobToDataURL(blob);

  // The chrome.downloads API can handle data URLs directly.
  // No need to revoke data URLs, so the onChanged listener is no longer necessary.
  await chrome.downloads.download({ url, filename, saveAs });
}
