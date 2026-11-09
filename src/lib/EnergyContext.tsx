import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULTS, type Inputs } from './energy';

type EnergyContextValue = {
  inputs: Inputs;
  update: (key: keyof Inputs, value: number) => void;
};

const EnergyContext = createContext<EnergyContextValue | null>(null);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const update = (key: keyof Inputs, value: number) => {
    setInputs((current) => ({ ...current, [key]: value }));
  };
  return <EnergyContext.Provider value={{ inputs, update }}>{children}</EnergyContext.Provider>;
}

export function useEnergy() {
  const value = useContext(EnergyContext);
  if (!value) {
    throw new Error('EnergyProvider belum dipasang.');
  }
  return value;
}
