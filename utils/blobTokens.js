export function getBlobReadToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_TOKEN || null;
}

export function getBlobWriteToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}
