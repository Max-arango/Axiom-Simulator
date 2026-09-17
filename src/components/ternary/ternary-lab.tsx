"use client";

import { useState } from "react";
import { tritValues, type System } from "@/lib/ternary";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Converter } from "./converter";
import { GateExplorer } from "./gate-explorer";
import { ArithmeticTrace } from "./arithmetic-trace";

export function TernaryLab() {
  // Shared across tabs. Switching system keeps the conceptual value; the
  // converter re-encodes the same decimal in the new system.
  const [system, setSystem] = useState<System>("balanced");

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ternary Beta</h1>
        <p className="text-muted-foreground text-sm">
          Explore balanced and unbalanced base-3: conversion, single-trit gates,
          and the digit-by-digit adder.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <span className="mono-label text-muted-foreground text-xs uppercase">
          System
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          value={system}
          onValueChange={(v) => v && setSystem(v as System)}
        >
          <ToggleGroupItem value="balanced" className="px-4">
            Balanced
          </ToggleGroupItem>
          <ToggleGroupItem value="unbalanced" className="px-4">
            Unbalanced
          </ToggleGroupItem>
        </ToggleGroup>
        <span className="text-muted-foreground font-mono text-xs">
          {"{ "}
          {tritValues(system).join(", ")}
          {" }"}
        </span>
      </div>

      <Tabs defaultValue="converter" className="gap-6">
        <TabsList>
          <TabsTrigger value="converter">Converter</TabsTrigger>
          <TabsTrigger value="gates">Gates</TabsTrigger>
          <TabsTrigger value="arithmetic">Arithmetic</TabsTrigger>
        </TabsList>
        <TabsContent value="converter">
          <Converter system={system} />
        </TabsContent>
        <TabsContent value="gates">
          <GateExplorer system={system} />
        </TabsContent>
        <TabsContent value="arithmetic">
          <ArithmeticTrace />
        </TabsContent>
      </Tabs>
    </main>
  );
}
