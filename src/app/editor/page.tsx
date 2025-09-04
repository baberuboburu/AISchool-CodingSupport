'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

type FileItem = { id: string; name: string };
type LsShape = { files: FileItem[]; selectedId: string | null };

const LS_KEY = 'files_state_min_v1';       // サイドバー状態（既存）
const CODE_KEY = 'files_code_map_v1';      // 追加: id→コードのMap


// -------- localStorage ユーティリティ --------
const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

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

type CodeMap = Record<string, string>;
const readCodeMap = (): CodeMap =>
  safeParse<CodeMap>(typeof window !== 'undefined' ? localStorage.getItem(CODE_KEY) : null, {});

const writeCodeMap = (map: CodeMap) => {
  localStorage.setItem(CODE_KEY, JSON.stringify(map));
};

// -------- 言語判定 & 雛形 --------
// 拡張子 → Monaco 言語ID
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


export default function EditorPage() {
  // 1) サイドバー同期（既存）
  const [ls, setLs] = useState<LsShape>(() => readLS());
  useEffect(() => {
    const t = setInterval(() => {
      const next = readLS();
      if (
        next.selectedId !== ls.selectedId ||
        next.files.length !== ls.files.length ||
        next.files.some((f, i) => f.id !== ls.files[i]?.id || f.name !== ls.files[i]?.name)
      ) {
        setLs(next);
      }
    }, 300);
    return () => clearInterval(t);
  }, [ls]);

  // 2) コードの永続化マップ
  const [codeMap, setCodeMap] = useState<CodeMap>(() => readCodeMap());

  // 3) LSのファイル一覧と整合を取る（削除クリーンアップ & 新規は雛形付与）
  useEffect(() => {
    const ids = new Set(ls.files.map(f => f.id));
    let changed = false;
    const next: CodeMap = { ...codeMap };

    // 削除されたファイルを掃除
    for (const k of Object.keys(next)) {
      if (!ids.has(k)) { delete next[k]; changed = true; }
    }
    // 新規ファイルは空にする
    for (const f of ls.files) {
      if (!(f.id in next)) { 
        next[f.id] = ''; 
        changed = true; 
      }
    }
    if (changed) {
      setCodeMap(next);
      writeCodeMap(next);
    }
  }, [ls.files]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4) 現在の選択ファイル
  const selectedFile = useMemo(
    () => ls.files.find(f => f.id === ls.selectedId) || null,
    [ls.files, ls.selectedId]
  );
  const filename = selectedFile?.name || 'untitled';
  const language = extToLang(selectedFile?.name);

  // 5) 表示用のコード（選択変更で切替）
  const [code, setCode] = useState<string>('');
  useEffect(() => {
    const current = selectedFile ? codeMap[selectedFile.id] ?? '' : '';
    setCode(current);
  }, [selectedFile?.id, codeMap]);

  // 6) 変更保存（デバウンス）
  const saveTimer = useRef<number | null>(null);
  const persist = (id: string, content: string) => {
    const next = { ...codeMap, [id]: content };
    setCodeMap(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => writeCodeMap(next), 300);
  };

  // 7) Monaco テーマ
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
      <header className="bg-[#EBEEF1] w-full h-[31px] flex items-center">
        <span className="pl-[26px] text-[#0A2642] text-[14px] tracking-[0.10em]">
          {filename}
        </span>
      </header>

      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          path={filename}
          value={code}
          onChange={(v: string) => {
            const newText = v || '';
            setCode(newText);
            if (selectedFile?.id) persist(selectedFile.id, newText);
          }}
          onMount={handleMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
