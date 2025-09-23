import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function ClientBlobUploader({
  handleUploadUrl = '/api/blob/upload',
  accept = 'image/jpeg,image/png,image/webp,video/mp4',
  maxSizeMB = 200,
  onUploaded,
}) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const file = inputRef.current?.files?.[0];
    if (!file) return setError('파일을 선택해 주세요.');

    const allowList = accept.split(',');
    if (allowList.length && !allowList.includes(file.type)) {
      return setError(`허용되지 않은 형식입니다: ${file.type}`);
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return setError(`파일이 너무 큽니다. 최대 ${maxSizeMB}MB`);
    }

    try {
      setStatus('uploading');

      const isImage = file.type.startsWith('image/');
      const targetFolder = isImage ? 'images' : 'videos';
      const sanitizedName = file.name.replace(/\s+/g, '-');
      const targetPath = `${targetFolder}/${sanitizedName}`;

      const blob = await upload(targetPath, file, {
        access: 'public',
        handleUploadUrl,
        contentType: file.type,
      });

      setUploadedUrl(blob.url);
      setStatus('done');
      onUploaded?.(blob);
    } catch (err) {
      console.error(err);
      setError('업로드에 실패했습니다.');
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="block w-full text-sm"
      />
      <button
        type="submit"
        disabled={status === 'uploading'}
        className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 px-4 py-2 text-white disabled:opacity-60"
      >
        {status === 'uploading' ? '업로드 중…' : '업로드'}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {uploadedUrl && (
        <p className="break-all text-sm">
          업로드 완료: <a href={uploadedUrl} className="underline">{uploadedUrl}</a>
        </p>
      )}
    </form>
  );
}
