import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MobileStorage } from '../utils/mobileUtils';

export interface Bookmark {
  id: string;
  waypointSymbol: string;
  systemSymbol: string;
  name: string;
  type: string;
  notes?: string;
  createdAt: Date;
}

interface BookmarksContextType {
  bookmarks: Bookmark[];
  addBookmark: (waypointSymbol: string, systemSymbol: string, name: string, type: string, notes?: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  getBookmarksBySystem: (systemSymbol: string) => Bookmark[];
  searchBookmarks: (query: string) => Bookmark[];
  loadBookmarks: () => Promise<void>;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

export const useBookmarks = () => {
  const context = useContext(BookmarksContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarksProvider');
  }
  return context;
};

interface BookmarksProviderProps {
  children: ReactNode;
}

const BOOKMARKS_STORAGE_KEY = 'spacetraders_bookmarks';

export const BookmarksProvider: React.FC<BookmarksProviderProps> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const saveBookmarks = useCallback(async (bookmarksToSave: Bookmark[]) => {
    try {
      await MobileStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarksToSave));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      const stored = await MobileStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const bookmarksWithDates = parsed.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt)
        }));
        setBookmarks(bookmarksWithDates);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  }, []);

  const addBookmark = useCallback(async (
    waypointSymbol: string, 
    systemSymbol: string, 
    name: string, 
    type: string, 
    notes?: string
  ) => {
    const bookmark: Bookmark = {
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      waypointSymbol,
      systemSymbol,
      name,
      type,
      notes,
      createdAt: new Date()
    };
    
    const updatedBookmarks = [...bookmarks, bookmark];
    setBookmarks(updatedBookmarks);
    await saveBookmarks(updatedBookmarks);
  }, [bookmarks, saveBookmarks]);

  const removeBookmark = useCallback(async (id: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== id);
    setBookmarks(updatedBookmarks);
    await saveBookmarks(updatedBookmarks);
  }, [bookmarks, saveBookmarks]);

  const updateBookmark = useCallback(async (id: string, updates: Partial<Bookmark>) => {
    const updatedBookmarks = bookmarks.map(b => 
      b.id === id ? { ...b, ...updates } : b
    );
    setBookmarks(updatedBookmarks);
    await saveBookmarks(updatedBookmarks);
  }, [bookmarks, saveBookmarks]);

  const getBookmarksBySystem = useCallback((systemSymbol: string) => {
    return bookmarks.filter(b => b.systemSymbol === systemSymbol);
  }, [bookmarks]);

  const searchBookmarks = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return bookmarks.filter(b => 
      b.name.toLowerCase().includes(lowercaseQuery) ||
      b.waypointSymbol.toLowerCase().includes(lowercaseQuery) ||
      b.type.toLowerCase().includes(lowercaseQuery) ||
      (b.notes && b.notes.toLowerCase().includes(lowercaseQuery))
    );
  }, [bookmarks]);

  return (
    <BookmarksContext.Provider value={{
      bookmarks,
      addBookmark,
      removeBookmark,
      updateBookmark,
      getBookmarksBySystem,
      searchBookmarks,
      loadBookmarks
    }}>
      {children}
    </BookmarksContext.Provider>
  );
};