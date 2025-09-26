import { upload } from '@vercel/blob/client';
import { useCallback, useEffect, useRef, useState } from 'react';

function buildRegisterPayload(item) {
  if (!item) return null;
  const typeValue = (item.type || '').toLowerCase();
  const isImage = typeValue === 'image';
  const previewCandidates = [item.preview, item.poster, item.thumbnail];
  const basePreview = previewCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
  const srcCandidates = [item.src, item.poster, item.thumbnail, basePreview];
  const assetUrl = srcCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
  if (!assetUrl) return null;

  const posterCandidates = isImage
    ? [item.poster, assetUrl, item.thumbnail, basePreview]
    : [item.poster, item.thumbnail, basePreview];
  const posterUrl = posterCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  const thumbnailCandidates = isImage
    ? [item.thumbnail, posterUrl, assetUrl, basePreview]
    : [item.thumbnail, posterUrl, basePreview];
  const thumbnailUrl = thumbnailCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  const likesNumber = Number(item.likes);
  const viewsNumber = Number(item.views);

  const rawDuration = Number(item.durationSeconds);
  const durationSeconds = Number.isFinite(rawDuration) && rawDuration >= 0 ? Math.round(rawDuration) : 0;

  return {
    slug: item.slug,
    title: item.title || item.slug,
    description: item.description || '',
    url: assetUrl,
    durationSeconds,
    orientation: item.orientation || 'landscape',
    type: isImage ? 'image' : typeValue || 'video',
    poster: posterUrl || null,
    thumbnail: thumbnailUrl || null,
    likes: Number.isFinite(likesNumber) ? likesNumber : 0,
    views: Number.isFinite(viewsNumber) ? viewsNumber : 0,
    publishedAt: item.publishedAt || '',
  };
}

export default function useAdminModals({ hasToken, qs, refresh, setItems, setMetricsBySlug }) {
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', imageUrl: '', previewUrl: '', durationSeconds: '' });
  const [editInitialPreview, setEditInitialPreview] = useState('');
  const [editError, setEditError] = useState('');
  const [editStatus, setEditStatus] = useState('idle');
  const [editUploadState, setEditUploadState] = useState('idle');
  const [editUploadMessage, setEditUploadMessage] = useState('');
  const editFileInputRef = useRef(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState('idle');
  const [deleteError, setDeleteError] = useState('');

  const [undoInfo, setUndoInfo] = useState(null);
  const [undoStatus, setUndoStatus] = useState('idle');
  const undoTimeoutRef = useRef(null);

  const [metricsEditor, setMetricsEditor] = useState(null);

  useEffect(() => () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }, []);

  const clearUndoTimer = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  }, []);

  const openEditModal = useCallback((item) => {
    if (!item) return;
    const initialPreview = item.type === 'image'
      ? item.src || item.preview || ''
      : item.poster || item.thumbnail || item.preview || '';
    const numericDuration = (() => {
      const parsed = Number(item.durationSeconds);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;
      return Math.round(parsed);
    })();

    setEditForm({
      title: item.title || item.slug,
      description: item.description || '',
      imageUrl: '',
      previewUrl: initialPreview,
      durationSeconds: String(numericDuration),
    });
    setEditInitialPreview(initialPreview);
    setEditUploadMessage('');
    setEditUploadState('idle');
    setEditError('');
    setEditStatus('idle');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    setEditingItem({
      ...item,
      durationSeconds: numericDuration,
    });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingItem(null);
    setEditForm({ title: '', description: '', imageUrl: '', previewUrl: '', durationSeconds: '' });
    setEditInitialPreview('');
    setEditUploadMessage('');
    setEditUploadState('idle');
    setEditError('');
    setEditStatus('idle');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  }, []);

  const handleEditFieldChange = useCallback((field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if ((field === 'title' || field === 'durationSeconds') && editError) setEditError('');
  }, [editError]);

  const handleEditImageUpload = useCallback(async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !editingItem) return;

    setEditUploadMessage('');
    setEditError('');

    if (!file.type.startsWith('image/')) {
      setEditUploadState('error');
      setEditUploadMessage('이미지 파일만 업로드할 수 있어요.');
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }

    const maxSizeMB = 200;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setEditUploadState('error');
      setEditUploadMessage(`이미지 크기가 너무 커요. 최대 ${maxSizeMB}MB까지 가능합니다.`);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }

    try {
      setEditUploadState('uploading');
      const sanitizedName = file.name.replace(/\s+/g, '-');
      const uniqueName = `${Date.now()}-${sanitizedName}`;
      const blob = await upload(`images/${uniqueName}`, file, {
        access: 'public',
        handleUploadUrl: `/api/blob/upload${qs}`,
        contentType: file.type,
      });
      setEditForm((prev) => ({ ...prev, imageUrl: blob.url, previewUrl: blob.url }));
      setEditUploadState('success');
      setEditUploadMessage('새 이미지가 업로드되었습니다.');
    } catch (error) {
      console.error('Edit image upload failed', error);
      setEditUploadState('error');
      setEditUploadMessage('이미지 업로드에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  }, [editingItem, qs]);

  const handleRevertImage = useCallback(() => {
    setEditForm((prev) => ({ ...prev, imageUrl: '', previewUrl: editInitialPreview }));
    setEditUploadState('idle');
    setEditUploadMessage('기존 이미지로 되돌렸어요.');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  }, [editInitialPreview]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;
    if (!hasToken) {
      setEditError('관리자 토큰이 필요합니다.');
      return;
    }

    const trimmedTitle = (editForm.title || '').trim();
    if (!trimmedTitle) {
      setEditError('제목을 입력해 주세요.');
      return;
    }

    const trimmedDescription = (editForm.description || '').trim();
    const isImageType = editingItem.type === 'image';
    const rawDurationInput = typeof editForm.durationSeconds === 'string'
      ? editForm.durationSeconds.trim()
      : String(editForm.durationSeconds || '').trim();

    let resolvedDurationSeconds;
    if (rawDurationInput === '') {
      const currentDuration = Number(editingItem.durationSeconds);
      resolvedDurationSeconds = Number.isFinite(currentDuration)
        ? Math.max(0, Math.round(currentDuration))
        : 0;
    } else {
      const parsed = Number(rawDurationInput);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setEditError('재생 시간을 올바른 숫자로 입력해 주세요.');
        return;
      }
      resolvedDurationSeconds = Math.max(0, Math.round(parsed));
    }

    const newImageUrl = editForm.imageUrl;
    const basePreview = editInitialPreview || editingItem.preview || '';

    const assetUrl = isImageType
      ? newImageUrl
        || editingItem.src
        || editingItem.poster
        || editingItem.thumbnail
        || basePreview
        || ''
      : editingItem.src
        || editingItem.poster
        || editingItem.thumbnail
        || basePreview
        || newImageUrl
        || '';

    const posterUrl = isImageType
      ? (newImageUrl || assetUrl)
      : (newImageUrl || editingItem.poster || editingItem.thumbnail || basePreview || '');

    const thumbnailUrl = isImageType
      ? (newImageUrl || assetUrl)
      : (newImageUrl || editingItem.thumbnail || editingItem.poster || basePreview || '');

    if (!assetUrl) {
      setEditStatus('idle');
      setEditError('원본 소스를 찾을 수 없어요. 이미지를 다시 업로드해 주세요.');
      return;
    }

    setEditStatus('saving');
    setEditError('');

    try {
      const res = await fetch(`/api/admin/register${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: editingItem.slug,
          title: trimmedTitle,
          description: trimmedDescription,
          url: assetUrl,
          durationSeconds: resolvedDurationSeconds,
          orientation: editingItem.orientation,
          type: editingItem.type,
          poster: posterUrl,
          thumbnail: thumbnailUrl,
          likes: editingItem.likes,
          views: editingItem.views,
          publishedAt: editingItem.publishedAt,
          metaUrl: editingItem.url,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = payload?.error || 'save_failed';
        throw new Error(message);
      }

      setEditStatus('success');
      setItems((prev) => prev.map((it) => (it.slug === editingItem.slug
        ? { ...it, durationSeconds: resolvedDurationSeconds }
        : it)));
      setEditForm((prev) => ({
        ...prev,
        durationSeconds: String(resolvedDurationSeconds),
      }));
      setEditingItem((prev) => (prev ? {
        ...prev,
        durationSeconds: resolvedDurationSeconds,
      } : prev));
      await refresh();
      setTimeout(() => {
        closeEditModal();
      }, 900);
    } catch (error) {
      console.error('Edit save failed', error);
      setEditStatus('error');
      setEditError(error?.message === 'save_failed'
        ? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'
        : error?.message || '저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [closeEditModal, editForm.description, editForm.durationSeconds, editForm.imageUrl, editForm.title, editInitialPreview, editingItem, hasToken, qs, refresh, setItems]);

  const openDeleteModal = useCallback((item) => {
    setPendingDelete(item);
    setDeleteStatus('idle');
    setDeleteError('');
  }, []);

  const closeDeleteModal = useCallback(() => {
    setPendingDelete(null);
    setDeleteStatus('idle');
    setDeleteError('');
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    const payload = buildRegisterPayload(item);
    const metaUrl = typeof item.url === 'string' ? item.url : '';
    const body = item.url
      ? { url: item.url, slug: item.slug, type: item.type }
      : { pathname: item.pathname, slug: item.slug, type: item.type };
    setDeleteStatus('pending');
    setDeleteError('');

    try {
      const res = await fetch(`/api/admin/delete${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('delete_failed');

      closeDeleteModal();
      if (payload) {
        clearUndoTimer();
        setUndoInfo({
          payload,
          metaUrl,
          title: payload.title,
          slug: item.slug,
        });
        setUndoStatus('idle');
        undoTimeoutRef.current = setTimeout(() => {
          setUndoInfo(null);
          setUndoStatus('idle');
        }, 10000);
      } else {
        setUndoInfo(null);
        setUndoStatus('idle');
      }
      refresh();
    } catch (error) {
      console.error('Delete failed', error);
      setDeleteStatus('error');
      setDeleteError('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [pendingDelete, qs, clearUndoTimer, closeDeleteModal, refresh]);

  const handleUndoDelete = useCallback(async () => {
    if (!undoInfo) return;
    setUndoStatus('pending');
    try {
      const res = await fetch(`/api/admin/register${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...undoInfo.payload,
          metaUrl: undoInfo.metaUrl,
        }),
      });
      if (!res.ok) throw new Error('undo_failed');
      setUndoStatus('success');
      clearUndoTimer();
      undoTimeoutRef.current = setTimeout(() => {
        setUndoInfo(null);
        setUndoStatus('idle');
      }, 1200);
      await refresh();
    } catch (error) {
      console.error('Undo failed', error);
      setUndoStatus('error');
    }
  }, [undoInfo, qs, refresh, clearUndoTimer]);

  const handleDismissUndo = useCallback(() => {
    clearUndoTimer();
    setUndoInfo(null);
    setUndoStatus('idle');
  }, [clearUndoTimer]);

  const openMetricsEditor = useCallback((row) => {
    if (!row?.slug) return;
    const baseViews = typeof row.metrics?.views === 'number'
      ? row.metrics.views
      : (typeof row.views === 'number' ? row.views : null);
    const baseLikes = typeof row.metrics?.likes === 'number'
      ? row.metrics.likes
      : (typeof row.likes === 'number' ? row.likes : null);
    const views = baseViews === null ? '' : String(baseViews);
    const likes = baseLikes === null ? '' : String(baseLikes);
    setMetricsEditor({
      slug: row.slug,
      title: row.title || row.slug,
      views,
      likes,
      status: 'idle',
      error: '',
    });
  }, []);

  const closeMetricsEditor = useCallback(() => {
    setMetricsEditor(null);
  }, []);

  const handleMetricsFieldChange = useCallback((field, value) => {
    setMetricsEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
        error: '',
        status: prev.status === 'error' ? 'idle' : prev.status,
      };
    });
  }, []);

  const handleMetricsSave = useCallback(async () => {
    if (!metricsEditor || !hasToken) return;
    const { slug, views, likes } = metricsEditor;

    const parseValue = (raw) => {
      if (raw === null || raw === undefined) return null;
      if (String(raw).trim() === '') return null;
      const num = Number(raw);
      if (!Number.isFinite(num)) return null;
      return Math.max(0, Math.round(num));
    };

    const parsedViews = parseValue(views);
    const parsedLikes = parseValue(likes);

    if ((views && parsedViews === null) || (likes && parsedLikes === null)) {
      setMetricsEditor((prev) => (prev ? {
        ...prev,
        status: 'error',
        error: '숫자로 입력해 주세요.',
      } : prev));
      return;
    }

    setMetricsEditor((prev) => (prev ? { ...prev, status: 'saving', error: '' } : prev));

    const payload = { slug };
    if (parsedViews !== null) payload.views = parsedViews;
    if (parsedLikes !== null) payload.likes = parsedLikes;

    try {
      const res = await fetch(`/api/admin/metrics${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save_failed');
      const data = await res.json();
      const nextViews = Number(data?.views) || 0;
      const nextLikes = Number(data?.likes) || 0;
      setMetricsBySlug((prev) => ({
        ...prev,
        [slug]: { views: nextViews, likes: nextLikes },
      }));
      setItems((prev) => prev.map((item) => (item.slug === slug ? {
        ...item,
        views: nextViews,
        likes: nextLikes,
      } : item)));
      setMetricsEditor((prev) => (prev ? {
        ...prev,
        status: 'success',
        views: String(nextViews),
        likes: String(nextLikes),
        error: '',
      } : prev));
      setTimeout(() => {
        setMetricsEditor((prev) => {
          if (!prev || prev.slug === slug) return null;
          return prev;
        });
      }, 900);
    } catch (error) {
      setMetricsEditor((prev) => (prev ? {
        ...prev,
        status: 'error',
        error: '메트릭 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
      } : prev));
    }
  }, [hasToken, metricsEditor, qs, setItems, setMetricsBySlug]);

  return {
    editingItem,
    editForm,
    editInitialPreview,
    editError,
    editStatus,
    editUploadState,
    editUploadMessage,
    editFileInputRef,
    openEditModal,
    closeEditModal,
    handleEditFieldChange,
    handleEditImageUpload,
    handleRevertImage,
    handleSaveEdit,
    pendingDelete,
    deleteStatus,
    deleteError,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
    undoInfo,
    undoStatus,
    handleUndoDelete,
    handleDismissUndo,
    metricsEditor,
    openMetricsEditor,
    closeMetricsEditor,
    handleMetricsFieldChange,
    handleMetricsSave,
  };
}
