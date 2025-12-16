// ================================
// Density Mode Toggle Component
// ================================
// Toggle button for switching between compact and comfortable view modes

'use client';

import { useDensityMode } from '../hooks/use-density-mode';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Maximize2, Minimize2, MonitorSmartphone } from 'lucide-react';

export function DensityModeToggle() {
  const { mode, setMode } = useDensityMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MonitorSmartphone className="h-5 w-5" />
          <span className="sr-only">Toggle density mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>View Density</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setMode(value as 'compact' | 'comfortable')}>
          <DropdownMenuRadioItem value="compact" className="cursor-pointer">
            <Minimize2 className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium">Compact</span>
              <span className="text-xs text-muted-foreground">More info in less space</span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="comfortable" className="cursor-pointer">
            <Maximize2 className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium">Comfortable</span>
              <span className="text-xs text-muted-foreground">Easier to read and scan</span>
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

