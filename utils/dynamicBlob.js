export async function loadBlob() {
  // Avoid bundler static analysis by indirect dynamic import
  const i = new Function('m', 'return import(m)');
  return i('@vercel/blob');
}

