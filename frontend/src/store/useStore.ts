import { create } from 'zustand'

export type TabType = 'dashboard' | 'detection' | 'reports' | 'about' | 'settings'

export interface AnalysisResult {
  status: string // e.g. "HIGH RISK"
  coverage: string // e.g. "34.5%"
  overlay: string // base64 string
  mask: string // base64 string
  heatmap: string // base64 string
  original_width: number
  original_height: number
  imageUrl: string // original preview url
  timestamp: string
  fileName: string
}

export interface SettingsState {
  threshold: number
  apiUrl: string
}

interface AppState {
  activeTab: TabType
  uploadPreview: string | null
  rawFile: File | null
  analyzing: boolean
  analysisResult: AnalysisResult | null
  history: AnalysisResult[]
  settings: SettingsState
  earthHovered: boolean
  earthClicked: boolean
  
  setActiveTab: (tab: TabType) => void
  setUploadPreview: (url: string | null, file: File | null) => void
  setAnalyzing: (bool: boolean) => void
  setAnalysisResult: (res: AnalysisResult | null) => void
  addHistoryEntry: (entry: AnalysisResult) => void
  updateSettings: (settings: Partial<SettingsState>) => void
  clearHistory: () => void
  setEarthHovered: (hovered: boolean) => void
  setEarthClicked: (clicked: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  uploadPreview: null,
  rawFile: null,
  analyzing: false,
  analysisResult: null,
  history: [],
  settings: {
    threshold: 0.5,
    apiUrl: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000',
  },
  earthHovered: false,
  earthClicked: false,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setUploadPreview: (url, file) => set({ uploadPreview: url, rawFile: file, analysisResult: null }),
  setAnalyzing: (bool) => set({ analyzing: bool }),
  setAnalysisResult: (res) => set({ analysisResult: res }),
  addHistoryEntry: (entry) => set((state) => ({ history: [entry, ...state.history] })),
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  clearHistory: () => set({ history: [] }),
  setEarthHovered: (hovered) => set({ earthHovered: hovered }),
  setEarthClicked: (clicked) => set({ earthClicked: clicked }),
}))
