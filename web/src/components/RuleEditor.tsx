import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { WasmBridge } from '../utils/wasmBridge';
import SocketManager from './SocketManager';
import TileSocketEditor from './TileSocketEditor';

const RuleEditor: React.FC = () => {
  const { tiles } = useAppStore();
  const [activeTab, setActiveTab] = useState<'sockets' | 'assignments'>('assignments');

  // Calculate generated rules on the fly to show stats
  const ruleCount = useMemo(() => {
    return WasmBridge.generateRulesFromSockets(tiles).length;
  }, [tiles]);

  return (
    <div className="rule-editor">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
        </button>
        <button 
          className={`tab ${activeTab === 'sockets' ? 'active' : ''}`}
          onClick={() => setActiveTab('sockets')}
        >
          Sockets
        </button>
      </div>

      <div className="rule-stats">
        <span className="stat-label">Active Rules:</span>
        <span className="stat-value">{ruleCount}</span>
        <span className="stat-help">(Generated from matching sockets)</span>
      </div>

      <div className="tab-content">
        {activeTab === 'sockets' ? (
          <SocketManager />
        ) : (
          <TileSocketEditor />
        )}
      </div>
    </div>
  );
};

export default RuleEditor;
