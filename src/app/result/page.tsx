// src/app/result/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Editor, { OnMount } from '@monaco-editor/react';

type FileItem = { id: string; name: string };
type LsShape = { files: FileItem[]; selectedId: string | null };

const LS_KEY = 'files_state_min_v1';         // サイドバーの状態（ファイル一覧/選択ID）
const RID_KEY_PREFIX = 'dify_result_';       // assistant.tsx 側で保存する結果のキー接頭辞



// ===== LSを読む =====
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

// ===== 拡張子 → Monaco 言語ID =====
const extToLang = (name?: string): string => {
  const ext = (name?.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'abap': return 'abap';
    case 'cls': return 'apex';
    case 'azcli': return 'azcli';
    case 'bat':
    case 'cmd': return 'bat';
    case 'bicep': return 'bicep';
    case 'mligo': return 'cameligo';
    case 'clj':
    case 'cljs':
    case 'cljc':
    case 'edn': return 'clojure';
    case 'coffee': return 'coffeescript';
    case 'c': return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh': return 'cpp';
    case 'cs':
    case 'csx': return 'csharp';
    case 'csp': return 'csp';
    case 'css': return 'css';
    case 'cyp':
    case 'cypher': return 'cypher';
    case 'dart': return 'dart';
    case 'dockerfile': return 'dockerfile';
    case 'ecl': return 'ecl';
    case 'ex':
    case 'exs': return 'elixir';
    case 'flow': return 'flow9';
    case 'fs':
    case 'fsi':
    case 'fsx':
    case 'fsscript': return 'fsharp';
    case 'ftl': return 'freemarker2';
    case 'go': return 'go';
    case 'graphql':
    case 'gql': return 'graphql';
    case 'hbs': return 'handlebars';
    case 'hcl':
    case 'tf': return 'hcl';
    case 'htm':
    case 'html': return 'html';
    case 'ini':
    case 'cfg':
    case 'conf': return 'ini';
    case 'java': return 'java';
    case 'js':
    case 'mjs':
    case 'cjs': return 'javascript';
    case 'jl': return 'julia';
    case 'kt':
    case 'kts': return 'kotlin';
    case 'less': return 'less';
    case 'lexon': return 'lexon';
    case 'lua': return 'lua';
    case 'liquid': return 'liquid';
    case 'm3': return 'm3';
    case 'md':
    case 'markdown': return 'markdown';
    case 'mdx': return 'mdx';
    case 's':
    case 'asm': return 'mips';
    case 'dax': return 'msdax';
    case 'sql': return 'sql';
    case 'mysql': return 'mysql';
    case 'm': return 'objective-c';
    case 'pas':
    case 'pp': return 'pascal';
    case 'ligo': return 'pascaligo';
    case 'pl':
    case 'pm': return 'perl';
    case 'pgsql': return 'pgsql';
    case 'php':
    case 'phtml': return 'php';
    case 'p': return 'pla';
    case 'dats':
    case 'sats':
    case 'hats': return 'postiats';
    case 'pq':
    case 'pqm': return 'powerquery';
    case 'ps1':
    case 'psm1':
    case 'psd1': return 'powershell';
    case 'proto': return 'proto';
    case 'pug': return 'pug';
    case 'py':
    case 'pyw': return 'python';
    case 'qs': return 'qsharp';
    case 'r': return 'r';
    case 'razor': return 'razor';
    case 'redis': return 'redis';
    case 'redshift': return 'redshift';
    case 'rst': return 'restructuredtext';
    case 'rb':
    case 'erb':
    case 'rake': return 'ruby';
    case 'rs': return 'rust';
    case 'sb': return 'sb';
    case 'scala':
    case 'sc': return 'scala';
    case 'scm':
    case 'ss': return 'scheme';
    case 'scss': return 'scss';
    case 'sh':
    case 'bash': return 'shell';
    case 'sol': return 'sol';
    case 'aes': return 'aes';
    case 'sparql': return 'sparql';
    case 'st': return 'st';
    case 'swift': return 'swift';
    case 'sv':
    case 'svh': return 'systemverilog';
    case 'v': return 'verilog';
    case 'tcl': return 'tcl';
    case 'twig': return 'twig';
    case 'ts':
    case 'mts': return 'typescript';
    case 'tsp': return 'typespec';
    case 'vb': return 'vb';
    case 'wgsl': return 'wgsl';
    case 'xml':
    case 'svg': return 'xml';
    case 'yaml':
    case 'yml': return 'yaml';
    case 'json': return 'json';
    default: return 'plaintext';
  }
};

export default function ResultPage() {
  // === Dify 生レスポンス型（最小限） ===
  type DifyOutputs = {
    structured_output?: { result?: Array<{ explanation?: string }> };
    structured_output_1?: { files?: Array<{ name?: string; code?: string }> };
    summary?: string;
  };
  type DifyResponse =
    | { data: { outputs?: DifyOutputs } }   // data.outputs に入るパターン
    | { outputs?: DifyOutputs };            // outputs 直下パターン

  // 1) サイドバーの選択状態を購読
  const [ls, setLs] = useState<LsShape>(() => readLS());
  useEffect(() => {
    const t = setInterval(() => {
      const next = readLS();
      setLs((prev) => {
        if (
          next.selectedId !== prev.selectedId ||
          next.files.length !== prev.files.length ||
          next.files.some((f, i) => f.id !== prev.files[i]?.id || f.name !== prev.files[i]?.name)
        ) return next;
        return prev;
      });
    }, 300);
    return () => clearInterval(t);
  }, []);

  // 2) 現在の選択ファイル
  const selectedFile = useMemo(
    () => ls.files.find((f) => f.id === ls.selectedId) || null,
    [ls.files, ls.selectedId]
  );

  // 3) rid で受け取る（assistant.tsx → LS 保存 → /result?rid=... で遷移）
  const sp = useSearchParams();
  const rid = sp.get('rid');
  const [incoming, setIncoming] = useState<DifyResponse | null>(null);

  useEffect(() => {
    if (!rid) return;
    try {
      const raw = localStorage.getItem(RID_KEY_PREFIX + rid);
      if (!raw) {
        setIncoming(null);
        return;
      }
      const parsed = JSON.parse(raw) as DifyResponse;
      setIncoming(parsed);
    } catch {
      setIncoming(null);
    }
  }, [rid]);

  // 4) 生レスポンスから表示用値を派生（常に安全に辿る）
  const outputs: DifyOutputs | undefined =
    (incoming as any)?.data?.outputs ?? (incoming as any)?.outputs;

  const firstFile = outputs?.structured_output_1?.files?.[0];
  const code = firstFile?.code ?? '// 結果がありません';
  const filename = firstFile?.name ?? selectedFile?.name ?? 'untitled';
  const language = extToLang(filename);
  const note =
    outputs?.structured_output?.result?.[0]?.explanation ??
    outputs?.summary ??
    '';

  // 5) 読み込み中表示は rid があって incoming 未取得の間だけ
  const loading = Boolean(rid && !incoming);

  // 6) Monaco テーマ
  const handleMount: OnMount = (editor, monaco) => {
    monaco.editor.defineTheme('myTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#F8F8F8',
        'editor.foreground': '#373737',
        'editorLineNumber.foreground': '#91A0AF',
        'editorLineNumber.activeForeground': '#000000',
        'editor.wordHighlightBackground': '#F8F8F8',
        'editor.lineHighlightBackground': '#F8F8F8',
      },
    });
    monaco.editor.setTheme('myTheme');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F8F8F8]">
      {/* ヘッダー */}
      <header className="bg-[#EBEEF1] w-full h-[31px] flex items-center">
        <span className="pl-[26px] text-[#0A2642] text-[14px] tracking-[0.10em]">
          {filename} {loading ? '（読み込み中…）' : ''}
        </span>
      </header>

      {/* 読み取り専用エディター */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          path={filename}
          value={code}
          onMount={handleMount}
          options={{
            readOnly: true,
            domReadOnly: true,
            contextmenu: false,
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {/* 最下部のテキストブロック */}
      <div className="bg-[#0A2642] rounded-[10px] mx-[26px] mb-[22px]">
        <p className="text-white text-[18px] font-bold tracking-[0.06em] leading-none px-[30px] py-[16px]">
          コードの解説
        </p>
        <div className="w-full h-[1px] border border-white opacity-[20%]" />
        <textarea
          className="w-full h-[110px] resize-none rounded-[6px] px-[30px] py-[21px] text-white text-[12px] font-normal tracking-[0em] leading-none focus:outline-none bg-transparent"
          placeholder="補足・説明・注意点などが表示されます。"
          value={note}
          readOnly
        />
      </div>
    </div>
  );
}
