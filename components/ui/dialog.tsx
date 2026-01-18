'use client';
import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

// Simulation simple d'un Dialog pour l'instant
export const Dialog = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 rounded-lg shadow-lg animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <button 
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={() => onOpenChange(false)} />
    </div>
  );
}

export const DialogContent = ({ className, children }: any) => (
  <div className={cn("grid gap-4", className)}>{children}</div>
)

export const DialogHeader = ({ className, children }: any) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-0", className)}>{children}</div>
)

export const DialogTitle = ({ className, children }: any) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>
)