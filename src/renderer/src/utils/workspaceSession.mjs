const SNAPSHOT_VERSION = 1

export function createWorkspaceSnapshot(options = {}) {
  return {
    version: SNAPSHOT_VERSION,
    goodsList: Array.isArray(options.goodsList) ? JSON.parse(JSON.stringify(options.goodsList)) : [],
    promptText: String(options.promptText || ''),
    selectedTemplate: options.selectedTemplate || '',
    selectedSize: options.selectedSize || '',
    selectedResolution: options.selectedResolution || '',
    selectedRenderMode: options.selectedRenderMode || '',
    currentFolderName: options.currentFolderName || '',
    activeTab: options.activeTab || 'create',
    createdAt: options.timestamp || Date.now()
  }
}

export function restoreWorkspaceSnapshot(raw) {
  if (!raw) return null
  const snapshot = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!snapshot || snapshot.version !== SNAPSHOT_VERSION) return null
  return {
    ...snapshot,
    goodsList: Array.isArray(snapshot.goodsList) ? snapshot.goodsList : []
  }
}
