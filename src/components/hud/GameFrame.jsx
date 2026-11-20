import TopHUD from './TopHUD';
import ToolsSidebar from './ToolsSidebar';

/**
 * Persistent frame for the playable level: the top HUD, the right tools
 * sidebar and the central canvas area where the Phaser game mounts.
 */
export default function GameFrame({ children }) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-[#0b2a4a]">
      <TopHUD />
      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden">
          {children}
        </main>
        <ToolsSidebar />
      </div>
    </div>
  );
}
