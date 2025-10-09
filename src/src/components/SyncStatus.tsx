import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

export const SyncStatus = () => {
  const { isOnline, isSyncing, syncStats, syncPendingData } = useOfflineSync();

  const getStatusColor = () => {
    if (!isOnline) return "bg-destructive";
    if (syncStats.pending > 0) return "bg-warning";
    if (syncStats.error > 0) return "bg-destructive";
    return "bg-success";
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSyncing) return "Sincronizando...";
    if (syncStats.pending > 0) return `${syncStats.pending} pendentes`;
    if (syncStats.error > 0) return `${syncStats.error} erros`;
    return "Sincronizado";
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    if (isSyncing) return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (syncStats.pending > 0) return <Clock className="h-3 w-3" />;
    if (syncStats.error > 0) return <XCircle className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-1 text-white border-transparent",
                getStatusColor()
              )}
            >
              {getStatusIcon()}
              <span className="text-xs">{getStatusText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-success" />
                ) : (
                  <WifiOff className="h-3 w-3 text-destructive" />
                )}
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>
              
              {syncStats.pending > 0 && (
                <div className="flex justify-between">
                  <span>Pendentes:</span>
                  <span>{syncStats.pending}</span>
                </div>
              )}
              
              {syncStats.synced > 0 && (
                <div className="flex justify-between">
                  <span>Sincronizados:</span>
                  <span>{syncStats.synced}</span>
                </div>
              )}
              
              {syncStats.error > 0 && (
                <div className="flex justify-between">
                  <span>Erros:</span>
                  <span>{syncStats.error}</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {(syncStats.pending > 0 || syncStats.error > 0) && isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={syncPendingData}
            disabled={isSyncing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
};