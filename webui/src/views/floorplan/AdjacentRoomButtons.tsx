import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { getRoomName, type Room } from '@/stores/dataStore';
import type { AdjacentRoom } from './types';

interface AdjacentRoomButtonsProps {
  adjacentRooms: AdjacentRoom[];
  roomWidth: number;
  roomHeight: number;
  startPoint: { x: number; y: number; z?: number };
  canvasLeft: number;
  canvasTop: number;
  canvasWidth: number;
  canvasHeight: number;
  onNavigateToRoom?: (room: Room) => void;
}

export function AdjacentRoomButtons({
  adjacentRooms,
  roomWidth,
  roomHeight,
  startPoint,
  canvasLeft,
  canvasTop,
  canvasWidth,
  canvasHeight,
  onNavigateToRoom,
}: AdjacentRoomButtonsProps) {
  if (!onNavigateToRoom || adjacentRooms.length === 0) return null;

  return (
    <>
      {adjacentRooms.map(({ room: adjRoom, direction, overlapStart, overlapEnd }, index) => {
        const adjRoomName = getRoomName(adjRoom);
        
        // Calculate position at center of shared boundary
        const overlapCenter = (overlapStart + overlapEnd) / 2;
        
        const getPositionStyle = (): React.CSSProperties => {
          // Calculate position along the shared boundary
          const yPercent = ((overlapCenter - startPoint.y) / roomHeight);
          const xPercent = ((overlapCenter - startPoint.x) / roomWidth);
          
          switch (direction) {
            case 'left': {
              // Position at left edge of canvas
              const screenY = canvasTop + canvasHeight * (1 - yPercent);
              return {
                left: `${canvasLeft}px`,
                top: `${screenY}px`,
                transform: 'translate(-100%, -50%)',
              };
            }
            case 'right': {
              // Position at right edge of canvas
              const screenY = canvasTop + canvasHeight * (1 - yPercent);
              return {
                left: `${canvasLeft + canvasWidth}px`,
                top: `${screenY}px`,
                transform: 'translate(0%, -50%)',
              };
            }
            case 'top': {
              // Position at top edge of canvas
              const screenX = canvasLeft + canvasWidth * xPercent;
              return {
                left: `${screenX}px`,
                top: `${canvasTop}px`,
                transform: 'translate(-50%, -100%)',
              };
            }
            case 'bottom': {
              // Position at bottom edge of canvas
              const screenX = canvasLeft + canvasWidth * xPercent;
              return {
                left: `${screenX}px`,
                top: `${canvasTop + canvasHeight}px`,
                transform: 'translate(-50%, 0%)',
              };
            }
          }
        };
        
        const getArrowIcon = () => {
          switch (direction) {
            case 'left': return <ArrowLeft className="h-4 w-4" />;
            case 'right': return <ArrowRight className="h-4 w-4" />;
            case 'top': return <ArrowUp className="h-4 w-4" />;
            case 'bottom': return <ArrowDown className="h-4 w-4" />;
          }
        };
        
        return (
          <button
            key={`${adjRoomName}-${direction}-${index}`}
            onClick={() => onNavigateToRoom(adjRoom)}
            className="absolute flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border-2 border-primary/40 shadow-md transition-all hover:scale-105 z-20"
            style={getPositionStyle()}
            title={`Zu ${adjRoomName} wechseln`}
          >
            {getArrowIcon()}
            <span className="text-xs font-medium whitespace-nowrap">{adjRoomName}</span>
          </button>
        );
      })}
    </>
  );
}
