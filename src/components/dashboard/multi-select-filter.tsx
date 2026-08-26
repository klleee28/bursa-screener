"use client"

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function MultiSelectFilter({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  const summary = selected.length === 0 ? `All ${label.toLowerCase()}` : selected.length === 1 ? selected[0] : `${selected.length} ${label.toLowerCase()}`

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="filter-trigger" />}>
        <span className="truncate">{summary}</span>
        <ChevronsUpDownIcon data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const active = selected.includes(option)
                return (
                  <CommandItem key={option} value={option} data-checked={active} onSelect={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}>
                    <span className={cn("filter-check", active && "filter-check-active")}><CheckIcon /></span>
                    <span className="truncate">{option}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {selected.length ? (
            <div className="border-t p-2">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>Clear filter</Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
