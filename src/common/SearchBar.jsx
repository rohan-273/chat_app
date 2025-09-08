function SearchBar({ 
  searchInputRef, 
  searchQuery, 
  setSearchQuery, 
  onSearch, 
  searchResults, 
  currentSearchIndex, 
  onNavigateUp, 
  onNavigateDown, 
  onClose 
}) {
  return (
    <div className="p-4 bg-yellow-50 border-b border-yellow-200">
      <div className="flex items-center gap-2">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Search messages..."
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onSearch}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Search
        </button>
        {searchResults.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={onNavigateUp}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              ↑
            </button>
            <span className="text-sm text-gray-600">
              {currentSearchIndex + 1}/{searchResults.length}
            </span>
            <button
              onClick={onNavigateDown}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              ↓
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default SearchBar;