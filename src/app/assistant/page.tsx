'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type FileItem = { id: string; name: string };
type LsShape = { files: FileItem[]; selectedId: string | null };
const LS_KEY = 'files_state_min_v1';

// LSを読む
const readLS = (): LsShape => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { files: [], selectedId: null };
    const parsed = JSON.parse(raw) as LsShape;
    return {
      files: Array.isArray(parsed?.files) ? parsed.files : [],
      selectedId:
        typeof parsed?.selectedId === 'string' || parsed?.selectedId === null
          ? parsed.selectedId
          : null,
    };
  } catch {
    return { files: [], selectedId: null };
  }
};

function AssistantDesire({
  item,
  active,
  onClick,
}: {
  item: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className={`w-full h-[43px] rounded-[3px] flex justify-center items-center ${
        active ? 'bg-[#0A2642] text-white' : 'bg-[#EBEEF1] text-[#0A2642]'
      }`}
    >
      <span className="text-[12px]">{item}</span>
    </li>
  );
}

function AssistantList({
  filename,
  checked,
  onChange,
}: {
  filename: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <li className="relative flex justify-start items-center gap-[6px]">
      <input
        className="appearance-none peer w-[13px] h-[13px] rounded-[2px] bg-[#EBEEF1]"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <svg
        className="absolute top-[6px] left-[2.5px] pointer-events-none opacity-0 peer-checked:opacity-100"
        width="8"
        height="6"
        viewBox="0 0 8 6"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7.82609 0.182527C8.05797 0.407176 8.05797 0.800312 7.82609 1.02496L3.25975 5.81747C3.04571 6.06084 2.67113 6.06084 2.45708 5.81747L0.173913 3.42122C-0.057971 3.19657 -0.057971 2.80343 0.173913 2.57878C0.38796 2.33541 0.762542 2.33541 0.976589 2.57878L2.86734 4.54446L7.02341 0.182527C7.23746 -0.0608424 7.61204 -0.0608424 7.82609 0.182527Z"
          fill="black"
        />
      </svg>
      <span className="text-[#0A2642] text-[12px] font-bold">{filename}</span>
    </li>
  );
}

export default function AssistantPage() {
  // サイドバーの状態を購読（ファイル名のソース）
  const [ls, setLs] = useState<LsShape>(() => readLS());
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const CODE_KEY = 'files_code_map_v1';
  const RID_KEY_PREFIX = 'dify_result_';
  const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY
  const uid = () => Math.random().toString(36).slice(2, 10);
  const selectedFile = useMemo(
    () => ls.files.find(f => f.id === ls.selectedId) || null,
    [ls.files, ls.selectedId]
  );

  function getCodeById(id: string): string {
    try {
      const raw = localStorage.getItem(CODE_KEY);
      if (!raw) return '';
      const map = JSON.parse(raw) as Record<string, string>;
      return map[id] ?? '';
    } catch {
      return '';
    }
  }

  const runDify = async (fileId: string, filename: string) => {
    try {
      // 1) 送信するコードをLSから取得
      const code = getCodeById(fileId);
      setLoading(true);

      // 2) Dify が期待する形式に整形
      const filesJson = JSON.stringify([
        {
          name: filename,
          content: code,
        },
      ]);

      const body = {
        inputs: {
          files: filesJson,
          task_type: desires[activeDesireIndex], // 例: 'エラー解決' | 'コードの解説' | 'コメントアウトの追加'
          note: '', // ← 補足欄を使う場合は、textarea の state をここに
        },
        response_mode: 'blocking',
        user: `web-${Math.random().toString(36).slice(2)}`,
      };

      const res = await fetch('https://api.dify.ai/v1/workflows/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,       // ← ここで公開キーを使うのは危険。サーバー経由推奨
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // 3) 結果をLSに保存 → ridを付けて遷移（既存フローを踏襲）
      const rid = uid();
      localStorage.setItem(RID_KEY_PREFIX + rid, JSON.stringify(data));
      router.push(`/result?rid=${rid}`);
    } catch (e) {
      console.error(e);
      // TODO: トースト等で通知
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const t = setInterval(() => {
      const next = readLS();
      if (
        next.selectedId !== ls.selectedId ||
        next.files.length !== ls.files.length ||
        next.files.some(
          (f, i) => f.id !== ls.files[i]?.id || f.name !== ls.files[i]?.name
        )
      ) {
        setLs(next);
      }
    }, 300);
    return () => clearInterval(t);
  }, [ls]);

  const files = ls.files; // 左リスト表示

  // 左側の選択（最大3つ）
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelect = (id: string, next: boolean) => {
    setSelectedIds((prev) => {
      if (next) {
        if (prev.includes(id)) return prev;
        if (prev.length >= 3) return prev; // 最大3件
        return [...prev, id];
      } else {
        return prev.filter((x) => x !== id);
      }
    });
  };

  // 右側に表示する選択中ファイル名
  const selectedNames = useMemo(
    () =>
      selectedIds
        .map((id) => files.find((f) => f.id === id)?.name)
        .filter((v): v is string => !!v),
    [selectedIds, files]
  );

  // LLMへの要望（単一選択）
  const desires = ['エラー解決', 'コードの解説', 'コメントアウトの追加'] as const;
  const [activeDesireIndex, setActiveDesireIndex] = useState<number>(0);

  return (
    <div className="pt-[94px] pb-[158px] bg-[#F8F8F8] h-[928px]">
      <div className="h-full flex justify-center items-stretch gap-[41px]">
        {/* 左カラム */}
        <section className="w-[407px] h-full flex flex-col">
          {/* ファイル選択 */}
          <div className="w-full h-[300px] bg-white rounded-[10px]">
            <div className="w-full h-[37px] rounded-t-[10px] bg-[#0B284A] text-white font-bold leading-none flex justify-center items-center gap-2">
              <span className="text-[14px]">ファイル選択</span>
              <span className="text-[12px]">（最大３ファイル）</span>
            </div>
            <div className="w-full h-auto bg-white px-[16px] py-[20px]">
              <ul className="flex flex-col justify-start items-start gap-[20px]">
                {files.length === 0 ? (
                  <li className="text-[12px] text-[#7A8A9A]">ファイルがありません</li>
                ) : (
                  files.map((f) => (
                    <AssistantList
                      key={f.id}
                      filename={f.name || 'untitled'}
                      checked={selectedIds.includes(f.id)}
                      onChange={(next) => toggleSelect(f.id, next)}
                    />
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* 余白 */}
          <div className="flex-1" />

          {/* LLMへの要望（左） */}
          <div className="w-full h-[300px] bg-white rounded-[10px]">
            <div className="w-full h-[37px] rounded-t-[10px] bg-[#0B284A] text-white text-[14px] font-bold leading-none flex justify-center items-center">
              LLMへの要望
            </div>
            <div className="w-full h-auto px-[9px] py-[12px]">
              <ul className="w-full px-[9px] flex flex-col justify-center items-center gap-[6px] text-[12px] font-bold">
                {desires.map((d, i) => (
                  <AssistantDesire
                    key={d}
                    item={d}
                    active={i === activeDesireIndex}
                    onClick={() => setActiveDesireIndex(i)}
                  />
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 中央の矢印 */}
        <div className="h-full flex items-center justify-center self-center">
          <svg
            width="23"
            height="27"
            viewBox="0 0 23 27"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22 11.7679C23.3333 12.5378 23.3333 14.4622 22 15.232L3.25 26.0574C1.91666 26.8272 0.249999 25.8649 0.249999 24.3253L0.25 2.67468C0.25 1.13508 1.91667 0.17283 3.25 0.942631L22 11.7679Z"
              fill="#0A2642"
            />
          </svg>
        </div>

        {/* 右カラム */}
        <section className="h-full w=[407px] w-[407px] flex flex-col justify-between items-start">
          <div className="h-auto w-full px-[19px] pt-[16px] pb-[23px] bg-[#0A2642] rounded-[10px]">
            <div className="text-white">
              <div>
                <div className="text-[14px] font-bold mb-[21px]">選択中のファイル</div>
                <ul className="flex flex-col gap-[27px]">
                  {selectedNames.length === 0 ? (
                    <li className="text-[12px] opacity-[70%] pl-[15px]">未選択</li>
                  ) : (
                    selectedNames.map((n) => (
                      <li key={n} className="text-[12px] opacity-[70%] pl-[15px]">
                        {n}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <div className="text-[14px] font-bold mt-[47px] mb-[21px]">LLMへの要望</div>
                <div className="text-[12px] opacity-[70%] pl-[15px]">
                  {desires[activeDesireIndex]}
                </div>
              </div>

              <div>
                <div className="text-[14px] font-bold mt-[61px] mb-[21px]">補足</div>
                <textarea
                  className="w-full h-[188px] resize-none rounded-[3px] bg-white px-[8px] py-[13px] text-[12px] text-black placeholder:opacity-[50%] focus:outline-none"
                  placeholder="できるだけ丁寧に解説してください。"
                />
              </div>
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="w-full h-[62px] flex justify-center items-center px-[1px] mt-[23px]">
            <button 
              type="button"
              className="w-full h-full rounded-[6px] text-white text-[16px] font-bold tracking-[0.1em] leading-none bg-[linear-gradient(to_right,#0152A3_0%,#00A5EC_100%)]"
              onClick={() => {
                if (selectedFile) runDify(selectedFile.id, selectedFile.name);
              }}
              disabled={loading}>
              {loading ? '送信中…' : 'LLMに送信'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
