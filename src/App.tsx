import { useState, useEffect } from "react";
import { 
  Newspaper, 
  History, 
  Settings, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Post {
  id: number;
  url: string;
  title: string;
  category: string;
  posted_at: string;
}

interface Log {
  id: number;
  message: string;
  level: string;
  timestamp: string;
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs" | "settings">("dashboard");

  const fetchData = async () => {
    try {
      const [postsRes, logsRes] = await Promise.all([
        fetch("/api/posts"),
        fetch("/api/logs")
      ]);
      const postsData = await postsRes.json();
      const logsData = await logsRes.json();
      setPosts(postsData);
      setLogs(logsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const runBot = async () => {
    setRunning(true);
    try {
      await fetch("/api/run", { method: "POST" });
      setTimeout(fetchData, 2000);
    } catch (err) {
      console.error("Failed to run bot:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">NewsBot Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={runBot}
              disabled={running}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Running..." : "Run Bot Now"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-8">
          {[
            { id: "dashboard", label: "Dashboard", icon: History },
            { id: "logs", label: "System Logs", icon: Terminal },
            { id: "settings", label: "Configuration", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Stats & Recent Posts */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Posts</p>
                    <p className="text-3xl font-bold text-slate-900">{posts.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Last Post</p>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {posts[0]?.title || "None yet"}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Status</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Active
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900">Recent Facebook Posts</h2>
                    <History className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="divide-y divide-slate-100">
                    {loading ? (
                      <div className="p-12 text-center text-slate-400">Loading posts...</div>
                    ) : posts.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">No posts yet. Run the bot to start!</div>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="p-6 hover:bg-slate-50 transition-colors group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  post.category === 'war' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {post.category}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(post.posted_at).toLocaleString()}
                                </span>
                              </div>
                              <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {post.title}
                              </h3>
                            </div>
                            <a 
                              href={post.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar: Activity Feed */}
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold">Live Activity</h2>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {logs.slice(0, 10).map((log) => (
                      <div key={log.id} className="text-xs border-l-2 border-slate-700 pl-3 py-1">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className={log.level === 'ERROR' ? 'text-red-400' : 'text-indigo-400'}>
                            {log.level}
                          </span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "logs" && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="font-bold text-slate-900">System Event Logs</h2>
                <Terminal className="w-4 h-4 text-slate-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Level</th>
                      <th className="px-6 py-3">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                            log.level === 'ERROR' ? 'bg-red-100 text-red-700' :
                            log.level === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8">
                <div className="flex items-center gap-4 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <p className="text-sm">
                    Configuration is currently managed via environment variables. Please update your 
                    <strong> .env </strong> or <strong> Secrets </strong> panel to change these values.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                      Facebook Page ID
                      {process.env.FB_PAGE_ID ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Configured</span>
                      ) : (
                        <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Missing</span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      disabled 
                      value={process.env.FB_PAGE_ID || "Not configured"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                      Facebook Access Token
                      {process.env.FB_PAGE_ACCESS_TOKEN ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Configured</span>
                      ) : (
                        <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Missing</span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      disabled 
                      value={process.env.FB_PAGE_ACCESS_TOKEN ? "••••••••••••••••" : "Not configured"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                      Gemini API Key
                      {process.env.GEMINI_API_KEY1 ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Configured</span>
                      ) : (
                        <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Missing</span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      disabled 
                      value={process.env.GEMINI_API_KEY1 ? "••••••••••••••••" : "Not configured"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="pt-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Active RSS Feeds</h3>
                    <div className="space-y-2">
                      {[
                        "https://www.aljazeera.net/rss",
                        "https://feeds.bbci.co.uk/arabic/rss.xml",
                        "https://arabic.sport360.com/feed/",
                      ].map((feed, i) => (
                        <div key={i} className="bg-slate-50 px-4 py-2 rounded-lg text-xs text-slate-600 font-mono border border-slate-100">
                          {feed}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
