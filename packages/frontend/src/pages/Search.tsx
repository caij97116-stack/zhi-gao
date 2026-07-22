import { useState } from 'react';
import { searchApi, type SearchResult } from '../api';

export function Search() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [lang, setLang] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchApi.search(query, source || undefined, lang || undefined);
      setResults(data.results);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const sourceIcon: Record<string, string> = {
    github: 'GH',
    npm: 'npm',
    mcp: 'MCP',
  };

  const sourceColor: Record<string, string> = {
    github: 'bg-gray-700 text-gray-300',
    npm: 'bg-red-700 text-red-200',
    mcp: 'bg-blue-700 text-blue-200',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">项目搜索</h1>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 min-w-[200px] px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="搜索 Discord Bot 相关项目..."
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none"
          >
            <option value="">所有来源</option>
            <option value="github">GitHub</option>
            <option value="npm">npm</option>
            <option value="mcp">MCP</option>
          </select>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none"
          >
            <option value="">所有语言</option>
            <option value="TypeScript">TypeScript</option>
            <option value="JavaScript">JavaScript</option>
            <option value="Python">Python</option>
            <option value="Rust">Rust</option>
            <option value="Go">Go</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          搜索 GitHub、npm、MCP 上的公开 Discord Bot 相关开源项目。支持按来源和语言筛选。
        </p>
      </div>

      {loading && <div className="text-center text-gray-400 py-8">搜索中...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center text-gray-500 py-8">没有找到相关项目</div>
      )}

      <div className="space-y-3">
        {results.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl p-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${sourceColor[item.source]}`}>
                {sourceIcon[item.source]}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {item.stars !== undefined && <span>Stars: {item.stars}</span>}
                  {item.language && <span>语言: {item.language}</span>}
                  {item.license && <span>协议: {item.license}</span>}
                </div>
                {item.installCommand && (
                  <code className="mt-2 block text-xs bg-gray-900 px-2 py-1 rounded text-green-400">
                    {item.installCommand}
                  </code>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
