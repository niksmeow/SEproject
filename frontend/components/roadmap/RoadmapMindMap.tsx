'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Skill {
  name: string
  priority: string
  resources: Array<{
    title: string
    url: string
    type: string
  }>
  time_estimate: string
  impact: string
  description?: string
}

interface RoadmapData {
  skills: Skill[]
  total_estimated_time?: string
  expected_match_improvement?: string
}

interface RoadmapMindMapProps {
  roadmapData: RoadmapData
}

interface Node {
  name: string
  children?: Node[]
  skill?: Skill
}

export default function RoadmapMindMap({ roadmapData }: RoadmapMindMapProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const toggleNode = (nodeName: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeName)) {
      newExpanded.delete(nodeName)
    } else {
      newExpanded.add(nodeName)
    }
    setExpandedNodes(newExpanded)
  }

  // Build tree structure
  const buildTree = (): Node => {
    return {
      name: 'Career Path',
      children: roadmapData.skills.map((skill) => ({
        name: skill.name,
        skill,
        children: skill.resources.map((resource) => ({
          name: resource.title,
        })),
      })),
    }
  }

  const tree = buildTree()

  const renderNode = (node: Node, level: number = 0, path: string = 'root') => {
    const isExpanded = expandedNodes.has(path)
    const isSelected = selectedNode === path
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={path} className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => {
            if (hasChildren) toggleNode(path)
            setSelectedNode(path)
          }}
          className={`
            relative px-4 py-2 rounded-lg cursor-pointer transition-all duration-200
            ${isSelected ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border border-gray-200'}
            ${hasChildren ? 'hover:bg-gray-50' : ''}
            ${level === 0 ? 'font-bold text-lg' : level === 1 ? 'font-semibold' : 'text-sm'}
          `}
          style={{ marginLeft: `${level * 20}px`, marginTop: level > 0 ? '8px' : '0' }}
        >
          {node.name}
          {hasChildren && (
            <span className="ml-2 text-xs text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {node.skill && (
            <div className="mt-1 text-xs text-gray-500">
              {node.skill.time_estimate} • {node.skill.impact}
            </div>
          )}
        </motion.div>

        {hasChildren && isExpanded && (
          <div className="ml-4 mt-2 border-l-2 border-gray-200 pl-4">
            {node.children!.map((child, idx) =>
              renderNode(child, level + 1, `${path}-${idx}`)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[500px] glass p-6 rounded-lg overflow-auto">
      <div className="space-y-2">{renderNode(tree)}</div>

      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 glass p-4 rounded-lg"
        >
          <p className="text-sm text-gray-600">
            Click on skills to expand and see learning resources
          </p>
        </motion.div>
      )}
    </div>
  )
}
