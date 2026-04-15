'use client'

import React, { useState, useEffect } from 'react'
import { contentApi, Destination, ContentAsset, ContentBlock } from '@/lib/api'
import { Plus, AlertCircle, Loader, Image, FileText, MapPin } from 'lucide-react'

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<'destinations' | 'assets' | 'blocks'>('destinations')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [assets, setAssets] = useState<ContentAsset[]>([])
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newItem, setNewItem] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    setLoading(true)
    setError(null)
    try {
      const [destData, assetsData, blocksData] = await Promise.all([
        contentApi.destinations().catch(() => []),
        contentApi.assets().catch(() => []),
        contentApi.blocks().catch(() => []),
      ])
      setDestinations(destData)
      setAssets(assetsData)
      setBlocks(blocksData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name && !newItem.title && !newItem.url) {
      setError('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      if (activeTab === 'destinations') {
        const result = await contentApi.createDestination(newItem)
        setDestinations([...destinations, result])
      } else if (activeTab === 'assets') {
        const result = await contentApi.createAsset(newItem)
        setAssets([...assets, result])
      } else {
        const result = await contentApi.createBlock(newItem)
        setBlocks([...blocks, result])
      }
      setNewItem({})
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Content Library</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage destinations, media assets, and content blocks.</p>
        </div>
        <button
          onClick={() => {
            setNewItem({})
            setShowModal(true)
          }}
          className="bg-[#0F172A] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus size={20} /> Add {activeTab === 'destinations' ? 'Destination' : activeTab === 'assets' ? 'Asset' : 'Block'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          {(['destinations', 'assets', 'blocks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-4 font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? 'text-[#14B8A6] border-b-2 border-[#14B8A6] bg-slate-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'destinations' && <MapPin size={18} />}
              {tab === 'assets' && <Image size={18} />}
              {tab === 'blocks' && <FileText size={18} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="animate-spin text-slate-400" />
            </div>
          ) : activeTab === 'destinations' && destinations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin size={48} className="mx-auto mb-4 text-slate-300" />
              <div className="text-slate-400 text-sm font-medium">No destinations added yet</div>
            </div>
          ) : activeTab === 'assets' && assets.length === 0 ? (
            <div className="text-center py-12">
              <Image size={48} className="mx-auto mb-4 text-slate-300" />
              <div className="text-slate-400 text-sm font-medium">No assets uploaded yet</div>
            </div>
          ) : activeTab === 'blocks' && blocks.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <div className="text-slate-400 text-sm font-medium">No content blocks added yet</div>
            </div>
          ) : activeTab === 'destinations' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {destinations.map((dest) => (
                <div key={dest.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  {dest.cover_image && (
                    <img
                      src={dest.cover_image}
                      alt={dest.name}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-[#0F172A] mb-1">{dest.name}</h3>
                    <div className="text-xs text-slate-500 font-medium mb-2">{dest.country}</div>
                    <p className="text-sm text-slate-600 line-clamp-2">{dest.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'assets' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-slate-100 rounded-lg border border-slate-200 aspect-square flex items-center justify-center overflow-hidden hover:shadow-md transition-shadow">
                  {asset.type && asset.type.startsWith('image') ? (
                    <img
                      src={asset.url}
                      alt="asset"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <Image size={32} className="mx-auto text-slate-400" />
                      <div className="text-xs text-slate-500 font-medium">{asset.type}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="w-12 h-12 bg-[#14B8A6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-[#14B8A6]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#0F172A]">{block.title}</h3>
                    <div className="text-xs text-slate-500 font-medium mb-2">
                      {block.category}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{block.preview}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] p-8 max-w-md w-full shadow-xl">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-6">
              Add {activeTab === 'destinations' ? 'Destination' : activeTab === 'assets' ? 'Asset' : 'Content Block'}
            </h2>

            <div className="space-y-4">
              {activeTab === 'destinations' && (
                <>
                  <input
                    type="text"
                    placeholder="Destination Name"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={newItem.country || ''}
                    onChange={(e) => setNewItem({ ...newItem, country: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                  <textarea
                    placeholder="Description"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all resize-none h-24"
                  />
                </>
              )}

              {activeTab === 'assets' && (
                <>
                  <input
                    type="text"
                    placeholder="Asset URL"
                    value={newItem.url || ''}
                    onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Type (e.g., image/jpeg)"
                    value={newItem.type || ''}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma-separated)"
                    value={newItem.tags?.join(',') || ''}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        tags: e.target.value.split(',').map((t) => t.trim()),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                </>
              )}

              {activeTab === 'blocks' && (
                <>
                  <input
                    type="text"
                    placeholder="Block Title"
                    value={newItem.title || ''}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newItem.category || ''}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                  <textarea
                    placeholder="Preview Text"
                    value={newItem.preview || ''}
                    onChange={(e) => setNewItem({ ...newItem, preview: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all resize-none h-24"
                  />
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl bg-[#14B8A6] text-[#0F172A] font-bold hover:bg-[#0fa39f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
