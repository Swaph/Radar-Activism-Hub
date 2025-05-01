import React, { createContext, useState } from 'react';

export const ShellContext = createContext(null);

export function ShellProvider({ children }) {
    const [title, setTitle] = useState('Radar!');

    return (
        <ShellContext.Provider value={{ title, setTitle }}>
            {children} { }
        </ShellContext.Provider>
    );
}
