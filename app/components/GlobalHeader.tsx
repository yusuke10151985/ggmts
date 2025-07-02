{user && (
  <span className="ml-2 text-xs text-gray-400">
    {usageCount} / {usageLimit} 回
  </span>
)}

{role === 'premier' && (
  <span className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded">Premier</span>
)} 