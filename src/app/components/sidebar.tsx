// src/app/components/sidebar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type FileItem = { id: string; name: string };

const LS_KEY = 'files_state_min_v1';
const uid = () => Math.random().toString(36).slice(2, 10);


function SidebarItem({
  label,
  active,
  onSelect,
  onDelete,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex justify-between items-center h-[28px] w-full ${active ? 'bg-[#03192F]' : 'bg-[#0A2642]'}`}>
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left"
      >
        <span className="pl-[23px] text-white text-[12px] font-normal tracking-[0em] leading-none">
          {label}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-[14px] text-[#EBEEF1] hover:text-white font-bold px-[12px]"
        aria-label={`Delete file ${label}`}
      >
        &times;
      </button>
    </div>
  );
}



export default function Sidebar() {
  // 初期化
  const readLS = (): { files: FileItem[]; selectedId: string | null } => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { files: [], selectedId: null };
      const parsed = JSON.parse(raw) as { files: FileItem[]; selectedId: string | null };
      return {
        files: Array.isArray(parsed.files) ? parsed.files : [],
        selectedId: typeof parsed.selectedId === 'string' || parsed.selectedId === null ? parsed.selectedId : null,
      };
    } catch {
      return { files: [], selectedId: null };
    }
  };
  const initial = readLS();
  const [files, setFiles] = useState<FileItem[]>(initial.files);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 永続化
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ files, selectedId }));
  }, [files, selectedId]);

  // 追加
  const addFile = () => {
    const temp = { id: uid(), name: '' };
    setFiles(prev => [...prev, temp]);
    setEditingId(temp.id);
    setSelectedId(temp.id);
    // フォーカスは描画後
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // 入力確定（Enter/blur）
  const confirmName = (id: string, rawName: string) => {
    const name = rawName.trim();
    if (!name) {
      // 空なら追加取り消し
      setFiles(prev => prev.filter(f => f.id !== id));
      if (selectedId === id) {
        const first = files.find(f => f.id !== id);
        setSelectedId(first ? first.id : null);
      }
      setEditingId(null);
      return;
    }
    // 同名回避（name, name(1), name(2)...）
    const others = new Set(files.filter(f => f.id !== id).map(f => f.name));
    let final = name;
    let i = 1;
    while (others.has(final)) final = `${name}(${i++})`;

    setFiles(prev => prev.map(f => (f.id === id ? { ...f, name: final } : f)));
    setEditingId(null);
    setSelectedId(id);
  };

  // 削除機能の追加
  const deleteFile = (idToDelete: string) => {
    const newFiles = files.filter(f => f.id !== idToDelete);
    setFiles(newFiles);

    // 削除したファイルが選択中だった場合の処理
    if (selectedId === idToDelete) {
      // 新しいリストの先頭のファイルを選択、リストが空ならnull
      setSelectedId(newFiles.length > 0 ? newFiles[0].id : null);
    }
  };

  return (
    <aside className="w-[260px] bg-[#0A2642] flex flex-col">
      <div className="pt-[8px] px-[16px] pb-[9px]">
        <button
          onClick={addFile}
          className="flex justify-center items-center bg-white w-full h-[43px] rounded-[6px]"
          type="button"
        >
          <span>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 6.46875C13 6.90625 12.6562 7.21875 12.25 7.21875H7.25V12.2188C7.25 12.6562 6.90625 13 6.5 13C6.0625 13 5.75 12.6562 5.75 12.2188V7.21875H0.75C0.3125 7.21875 0 6.90625 0 6.5C0 6.0625 0.3125 5.71875 0.75 5.71875H5.75V0.71875C5.75 0.3125 6.0625 0 6.5 0C6.90625 0 7.25 0.3125 7.25 0.71875V5.71875H12.25C12.6562 5.71875 13 6.0625 13 6.46875Z" fill="#0A2642"/>
            </svg>
          </span>
          <span className="pl-[19px] text-[#0A2642] text-[14px] font-normal leading-none">
            ファイルを追加する
          </span>
        </button>

      </div>

      <nav className="flex flex-col gap-[15px] px-[16px] pb-[12px]">
        {files.map(f => {
          const active = selectedId === f.id;
          const editing = editingId === f.id;

          return (
            <div key={f.id} className="flex items-center h-[28px]">
              {editing ? (
                <input
                  ref={inputRef}
                  defaultValue={f.name}
                  placeholder="新しいファイル名"
                  className="ml-[23px] mr-[8px] h-[20px] flex-1 rounded-[4px] px-[6px] text-[12px] text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmName(f.id, (e.target as HTMLInputElement).value);
                  }}
                  onBlur={(e) => confirmName(f.id, e.currentTarget.value)}
                />
              ) : (
                <SidebarItem
                  label={f.name}
                  active={active}
                  onSelect={() => setSelectedId(f.id)}
                  onDelete={() => deleteFile(f.id)}
                />
              )}
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
