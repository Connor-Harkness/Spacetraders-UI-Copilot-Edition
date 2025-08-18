import React, { useEffect, useState } from 'react';
import { useTokens } from '../context/TokenContext';
import { spaceTraders } from '../services/api';
import { automationOrchestrator, AutomationState } from '../services/automation';
import { Ship, Contract, Waypoint } from '../types/api';

interface Task {
  id: string;
  type: 'navigation' | 'mining' | 'trading' | 'contract';
  shipSymbol: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  estimatedCompletion?: Date;
  progress?: number;
}

interface Bookmark {
  id: string;
  waypointSymbol: string;
  systemSymbol: string;
  name: string;
  type: string;
  notes?: string;
  createdAt: Date;
}

export default function OperationsScreen() {
  const { hasAgentToken } = useTokens();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ships, setShips] = useState<Ship[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [automationStates, setAutomationStates] = useState<AutomationState[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'bookmarks' | 'automation'>('tasks');

  useEffect(() => {
    if (hasAgentToken) {
      loadData();
      loadBookmarks();
      generateSampleTasks();
      
      // Set up automation state polling
      const automationInterval = setInterval(() => {
        setAutomationStates(automationOrchestrator.getAllAutomationStates());
      }, 2000);
      
      return () => clearInterval(automationInterval);
    }
  }, [hasAgentToken]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [shipsData, contractsData] = await Promise.all([
        spaceTraders.getMyShips(),
        spaceTraders.getMyContracts()
      ]);
      
      setShips(shipsData);
      setContracts(contractsData);
    } catch (err) {
      console.error('Operations data load error:', err);
      setError('Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = () => {
    try {
      const stored = localStorage.getItem('spacetraders_bookmarks');
      if (stored) {
        const parsed = JSON.parse(stored);
        setBookmarks(parsed.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt)
        })));
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  };

  const saveBookmarks = (bookmarks: Bookmark[]) => {
    try {
      localStorage.setItem('spacetraders_bookmarks', JSON.stringify(bookmarks));
    } catch (err) {
      console.error('Failed to save bookmarks:', err);
    }
  };

  const generateSampleTasks = () => {
    // Generate sample tasks based on current ships and contracts
    const sampleTasks: Task[] = [];
    
    ships.forEach(ship => {
      // Add navigation task if ship is in transit
      if (ship.nav.status === 'IN_TRANSIT') {
        sampleTasks.push({
          id: `nav-${ship.symbol}`,
          type: 'navigation',
          shipSymbol: ship.symbol,
          description: `Navigate to ${ship.nav.route?.destination.symbol}`,
          status: 'in_progress',
          priority: 'medium',
          estimatedCompletion: new Date(ship.nav.route?.arrival || Date.now() + 60000),
          progress: calculateNavProgress(ship)
        });
      }
      
      // Add mining task for ships at asteroid fields
      if (ship.nav.waypointSymbol.includes('ASTEROID')) {
        sampleTasks.push({
          id: `mine-${ship.symbol}`,
          type: 'mining',
          shipSymbol: ship.symbol,
          description: `Mining at ${ship.nav.waypointSymbol}`,
          status: ship.cooldown.remainingSeconds > 0 ? 'in_progress' : 'pending',
          priority: 'high',
          progress: ship.cargo.units / ship.cargo.capacity * 100
        });
      }
    });

    setTasks(sampleTasks);
  };

  const calculateNavProgress = (ship: Ship): number => {
    if (!ship.nav.route) return 0;
    
    const departure = new Date(ship.nav.route.departure);
    const arrival = new Date(ship.nav.route.arrival);
    const now = new Date();
    
    const totalTime = arrival.getTime() - departure.getTime();
    const elapsed = now.getTime() - departure.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
  };

  const addBookmark = (waypointSymbol: string, systemSymbol: string, name: string, type: string) => {
    const bookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      waypointSymbol,
      systemSymbol,
      name,
      type,
      createdAt: new Date()
    };
    
    const updatedBookmarks = [...bookmarks, bookmark];
    setBookmarks(updatedBookmarks);
    saveBookmarks(updatedBookmarks);
  };

  const removeBookmark = (id: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== id);
    setBookmarks(updatedBookmarks);
    saveBookmarks(updatedBookmarks);
  };

  const addTask = (type: Task['type'], shipSymbol: string, description: string, priority: Task['priority'] = 'medium') => {
    const task: Task = {
      id: `task-${Date.now()}`,
      type,
      shipSymbol,
      description,
      status: 'pending',
      priority
    };
    
    setTasks(prev => [...prev, task]);
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, status } : task
      )
    );
  };

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleStartAutomation = (shipSymbol: string, behavior: AutomationState['behavior']) => {
    automationOrchestrator.startAutomation(shipSymbol, behavior);
    setAutomationStates(automationOrchestrator.getAllAutomationStates());
  };

  const handleStopAutomation = (shipSymbol: string) => {
    automationOrchestrator.stopAutomation(shipSymbol);
    setAutomationStates(automationOrchestrator.getAllAutomationStates());
  };

  const handlePauseAutomation = (shipSymbol: string) => {
    automationOrchestrator.pauseAutomation(shipSymbol);
    setAutomationStates(automationOrchestrator.getAllAutomationStates());
  };

  const handleResumeAutomation = (shipSymbol: string) => {
    automationOrchestrator.resumeAutomation(shipSymbol);
    setAutomationStates(automationOrchestrator.getAllAutomationStates());
  };

  const getShipAutomationState = (shipSymbol: string): AutomationState | undefined => {
    return automationStates.find(state => state.shipSymbol === shipSymbol);
  };

  if (!hasAgentToken) {
    return (
      <div className="screen-container">
        <div className="no-token-message">
          <h2>Operations Panel</h2>
          <p>Please configure your agent token to access operations.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="screen-container">
        <h2>Operations Panel</h2>
        <p>Loading operations data...</p>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Operations Panel</h2>
        <p>Manage tasks, bookmarks, and ship automation</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      <div className="operations-tabs">
        <button 
          className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          📋 Task Queue ({tasks.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          🔖 Bookmarks ({bookmarks.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          🤖 Automation
        </button>
      </div>

      {activeTab === 'tasks' && (
        <div className="tasks-panel">
          <div className="panel-header">
            <h3>Task Queue</h3>
            <div className="task-actions">
              <select onChange={(e) => {
                const shipSymbol = e.target.value;
                if (shipSymbol) {
                  addTask('mining', shipSymbol, `Auto-mine with ${shipSymbol}`, 'high');
                }
              }}>
                <option value="">Add Mining Task...</option>
                {ships.map(ship => (
                  <option key={ship.symbol} value={ship.symbol}>
                    {ship.registration.name} ({ship.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>No active tasks</p>
                <small>Tasks will appear here as ships perform operations</small>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`task-item ${task.status} priority-${task.priority}`}>
                  <div className="task-header">
                    <div className="task-info">
                      <span className="task-type">{task.type.toUpperCase()}</span>
                      <span className="task-ship">{task.shipSymbol}</span>
                      <span className={`task-status ${task.status}`}>{task.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div className="task-actions">
                      {task.status === 'pending' && (
                        <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="start-btn">
                          ▶️ Start
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button onClick={() => updateTaskStatus(task.id, 'completed')} className="complete-btn">
                          ✅ Complete
                        </button>
                      )}
                      <button onClick={() => removeTask(task.id)} className="remove-btn">
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                  <div className="task-description">{task.description}</div>
                  {task.progress !== undefined && (
                    <div className="task-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${task.progress}%` }}></div>
                      </div>
                      <span className="progress-text">{Math.round(task.progress)}%</span>
                    </div>
                  )}
                  {task.estimatedCompletion && (
                    <div className="task-eta">
                      ETA: {task.estimatedCompletion.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="bookmarks-panel">
          <div className="panel-header">
            <h3>Waypoint Bookmarks</h3>
            <button 
              onClick={() => {
                const waypointSymbol = prompt('Enter waypoint symbol:');
                if (waypointSymbol) {
                  const systemSymbol = waypointSymbol.split('-').slice(0, 2).join('-');
                  addBookmark(waypointSymbol, systemSymbol, waypointSymbol, 'Custom');
                }
              }}
              className="add-bookmark-btn"
            >
              ➕ Add Bookmark
            </button>
          </div>

          <div className="bookmarks-list">
            {bookmarks.length === 0 ? (
              <div className="empty-state">
                <p>No bookmarks saved</p>
                <small>Add important waypoints to quickly navigate back to them</small>
              </div>
            ) : (
              bookmarks.map(bookmark => (
                <div key={bookmark.id} className="bookmark-item">
                  <div className="bookmark-header">
                    <div className="bookmark-info">
                      <h4>{bookmark.name}</h4>
                      <span className="bookmark-location">{bookmark.waypointSymbol}</span>
                      <span className="bookmark-system">{bookmark.systemSymbol}</span>
                      <span className="bookmark-type">{bookmark.type}</span>
                    </div>
                    <div className="bookmark-actions">
                      <button className="navigate-btn">🗺️ Show on Map</button>
                      <button onClick={() => removeBookmark(bookmark.id)} className="remove-btn">
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                  {bookmark.notes && (
                    <div className="bookmark-notes">{bookmark.notes}</div>
                  )}
                  <div className="bookmark-created">
                    Created: {bookmark.createdAt.toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'automation' && (
        <div className="automation-panel">
          <div className="panel-header">
            <h3>Ship Automation</h3>
            <p>Configure automated behaviors for your fleet</p>
          </div>

          <div className="automation-content">
            <div className="automation-overview">
              <h4>Fleet Overview</h4>
              <div className="fleet-automation-status">
                {ships.map(ship => {
                  const automationState = getShipAutomationState(ship.symbol);
                  return (
                    <div key={ship.symbol} className="ship-automation-card">
                      <div className="ship-automation-header">
                        <h5>{ship.registration.name}</h5>
                        <span className="ship-symbol">{ship.symbol}</span>
                        <span className={`ship-status ${ship.nav.status.toLowerCase()}`}>
                          {ship.nav.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {automationState ? (
                        <div className="automation-active">
                          <div className="automation-info">
                            <div className="automation-behavior">
                              Behavior: <strong>{automationState.behavior.toUpperCase()}</strong>
                            </div>
                            <div className="automation-task">
                              Task: {automationState.currentTask}
                            </div>
                            {automationState.progress > 0 && (
                              <div className="automation-progress">
                                <div className="progress-bar">
                                  <div className="progress-fill" style={{ width: `${automationState.progress}%` }}></div>
                                </div>
                                <span className="progress-text">{Math.round(automationState.progress)}%</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="automation-controls">
                            <div className="automation-status-display">
                              <span className={`status-indicator ${automationState.status}`}>
                                {automationState.status === 'running' && '🟢 RUNNING'}
                                {automationState.status === 'paused' && '🟡 PAUSED'}
                                {automationState.status === 'stopped' && '🔴 STOPPED'}
                                {automationState.status === 'error' && '❌ ERROR'}
                              </span>
                            </div>
                            
                            <div className="automation-buttons">
                              {automationState.status === 'running' && (
                                <>
                                  <button onClick={() => handlePauseAutomation(ship.symbol)} className="pause-btn">
                                    ⏸️ Pause
                                  </button>
                                  <button onClick={() => handleStopAutomation(ship.symbol)} className="stop-btn">
                                    ⏹️ Stop
                                  </button>
                                </>
                              )}
                              {automationState.status === 'paused' && (
                                <>
                                  <button onClick={() => handleResumeAutomation(ship.symbol)} className="resume-btn">
                                    ▶️ Resume
                                  </button>
                                  <button onClick={() => handleStopAutomation(ship.symbol)} className="stop-btn">
                                    ⏹️ Stop
                                  </button>
                                </>
                              )}
                              {(automationState.status === 'stopped' || automationState.status === 'error') && (
                                <div className="behavior-selection">
                                  <select onChange={(e) => {
                                    const behavior = e.target.value as AutomationState['behavior'];
                                    if (behavior) {
                                      handleStartAutomation(ship.symbol, behavior);
                                    }
                                  }}>
                                    <option value="">Start Automation...</option>
                                    <option value="mining">Mining</option>
                                    <option value="trading">Trading</option>
                                    <option value="contract">Contract</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {automationState.errorMessage && (
                            <div className="automation-error">
                              Error: {automationState.errorMessage}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="automation-inactive">
                          <div className="automation-status">
                            <span className="status-indicator">🔴 Manual</span>
                          </div>
                          <div className="behavior-selection">
                            <select onChange={(e) => {
                              const behavior = e.target.value as AutomationState['behavior'];
                              if (behavior) {
                                handleStartAutomation(ship.symbol, behavior);
                              }
                            }}>
                              <option value="">Start Automation...</option>
                              <option value="mining">Mining</option>
                              <option value="trading">Trading</option>
                              <option value="contract">Contract</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="automation-policies">
              <h4>Automation Policies</h4>
              <div className="policy-card">
                <h5>Mining Policy</h5>
                <div className="policy-controls">
                  <label>
                    Auto-sell when cargo full:
                    <input type="checkbox" defaultChecked />
                  </label>
                  <label>
                    Min fuel before refuel:
                    <input type="number" defaultValue={50} min={0} max={100} />%
                  </label>
                  <label>
                    Stop mining when credits exceed:
                    <input type="number" defaultValue={1000000} />
                  </label>
                </div>
              </div>

              <div className="policy-card">
                <h5>Trading Policy</h5>
                <div className="policy-controls">
                  <label>
                    Max buy price deviation:
                    <input type="number" defaultValue={10} min={0} max={100} />%
                  </label>
                  <label>
                    Min profit margin:
                    <input type="number" defaultValue={15} min={0} max={100} />%
                  </label>
                  <label>
                    Reserve credits:
                    <input type="number" defaultValue={100000} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}